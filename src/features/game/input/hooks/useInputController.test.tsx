// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { useInputController } from './useInputController';
import { CameraPreview } from '../components/CameraPreview';
import { HandCursorOverlay } from '../components/HandCursorOverlay';
import type { InputControllerEvents } from '../controllers/InputController';

const mocks = vi.hoisted(() => ({
  gesture: {
    start: vi.fn(async () => {}), stop: vi.fn(),
    setElements: vi.fn<(video: HTMLVideoElement, canvas: HTMLCanvasElement) => void>(),
    setEvents: vi.fn<(events: InputControllerEvents) => void>(),
  },
  mouse: { start: vi.fn(async () => {}), stop: vi.fn(), setEvents: vi.fn<(events: InputControllerEvents) => void>() },
}));
vi.mock('../controllers/GestureInputController', () => ({ GestureInputController: class {
  start = mocks.gesture.start;
  stop = mocks.gesture.stop;
  setElements = mocks.gesture.setElements;
  setEvents = mocks.gesture.setEvents;
} }));
vi.mock('../controllers/MouseInputController', () => ({ MouseInputController: class {
  start = mocks.mouse.start;
  stop = mocks.mouse.stop;
  setEvents = mocks.mouse.setEvents;
} }));

function Harness() {
  const input = useInputController();
  return <>
    <button onClick={() => void input.switchMode('mouse')}>Mouse</button>
    <button onClick={() => void input.switchMode('gesture')}>Gesture</button>
    <output data-testid="mode">{input.mode}</output>
    <output data-testid="busy">{String(input.isStarting)}</output>
    <output data-testid="error">{input.inputError}</output>
    <CameraPreview videoRef={input.videoRef} statusText={input.statusText} fps={input.fps} isGestureMode={input.mode === 'gesture'} />
    <HandCursorOverlay canvasRef={input.canvasRef} isGestureMode={input.mode === 'gesture'} />
  </>;
}
beforeEach(() => {
  vi.clearAllMocks();
  mocks.gesture.start.mockImplementation(async () => {});
});
afterEach(cleanup);

it('keeps video and canvas attached while mouse mode is active and switches back to gestures', async () => {
  const view = render(<Harness />);
  const video = view.container.querySelector('video');
  const canvas = view.container.querySelector('canvas');
  fireEvent.click(screen.getByText('Mouse'));
  expect(screen.getByTestId('mode').textContent).toBe('mouse');
  expect(view.container.querySelector('video')).toBe(video);
  expect(view.container.querySelector('canvas')).toBe(canvas);
  fireEvent.click(screen.getByText('Gesture'));
  await waitFor(() => expect(screen.getByTestId('mode').textContent).toBe('gesture'));
  expect(mocks.gesture.setElements).toHaveBeenCalledWith(video, canvas);
  expect(mocks.gesture.start).toHaveBeenCalledOnce();
  expect(mocks.mouse.stop).toHaveBeenCalledOnce();
});

it('minimizing the camera preserves the video element and allows another switch', async () => {
  const view = render(<Harness />);
  const video = view.container.querySelector('video');
  fireEvent.click(screen.getByRole('button', { name: 'Thu nhỏ camera' }));
  expect(view.container.querySelector('video')).toBe(video);
  expect(video?.parentElement?.hidden).toBe(true);
  fireEvent.click(screen.getByText('Mouse'));
  fireEvent.click(screen.getByText('Gesture'));
  await waitFor(() => expect(mocks.gesture.start).toHaveBeenCalledOnce());
  expect(mocks.gesture.setElements.mock.calls[0][0]).toBe(video);
});

it('shows camera permission failures while retaining mouse input, then allows retry', async () => {
  mocks.gesture.start.mockRejectedValueOnce(new DOMException('denied', 'NotAllowedError'));
  render(<Harness />);
  fireEvent.click(screen.getByText('Gesture'));
  await waitFor(() => expect(screen.getByTestId('error').textContent).toContain('Chưa được cấp quyền camera'));
  expect(screen.getByTestId('mode').textContent).toBe('mouse');
  expect(mocks.mouse.start).toHaveBeenCalledOnce();
  fireEvent.click(screen.getByText('Gesture'));
  await waitFor(() => expect(screen.getByTestId('mode').textContent).toBe('gesture'));
  expect(screen.getByTestId('error').textContent).toBe('');
});

it('ignores duplicate starts and completion of a cancelled camera request', async () => {
  let resolve!: () => void;
  mocks.gesture.start.mockImplementation(() => new Promise<void>((done) => { resolve = done; }));
  render(<Harness />);
  fireEvent.click(screen.getByText('Gesture'));
  fireEvent.click(screen.getByText('Gesture'));
  expect(mocks.gesture.start).toHaveBeenCalledOnce();
  expect(screen.getByTestId('busy').textContent).toBe('true');
  fireEvent.click(screen.getByText('Mouse'));
  await act(async () => resolve());
  expect(screen.getByTestId('mode').textContent).toBe('mouse');
  expect(screen.getByTestId('busy').textContent).toBe('false');
});

it('preserves worker errors after falling back and cleans both controllers on unmount', async () => {
  const view = render(<Harness />);
  fireEvent.click(screen.getByText('Gesture'));
  await waitFor(() => expect(screen.getByTestId('busy').textContent).toBe('false'));
  const events = mocks.gesture.setEvents.mock.calls[0][0] as InputControllerEvents;
  act(() => events.onError?.('Không tải được mô hình nhận diện'));
  expect(screen.getByTestId('mode').textContent).toBe('mouse');
  expect(screen.getByTestId('error').textContent).toContain('Không tải được mô hình');
  view.unmount();
  expect(mocks.gesture.stop).toHaveBeenCalled();
  expect(mocks.mouse.stop).toHaveBeenCalled();
});
