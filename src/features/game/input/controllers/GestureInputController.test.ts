// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { GestureInputController } from './GestureInputController';

const stopTrack = vi.fn();
const stream = { getTracks: () => [{ stop: stopTrack }] } as unknown as MediaStream;
const getUserMedia = vi.fn(async () => stream);
const workers: FakeWorker[] = [];
class FakeWorker {
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: ErrorEvent) => void) | null = null;
  terminate = vi.fn();
  postMessage = vi.fn();
  constructor() { workers.push(this); }
}
function controller() {
  const video = document.createElement('video');
  vi.spyOn(video, 'play').mockResolvedValue();
  const canvas = document.createElement('canvas');
  vi.spyOn(canvas, 'getContext').mockReturnValue(null);
  return { input: new GestureInputController(video, canvas), video };
}
beforeEach(() => {
  vi.clearAllMocks(); workers.length = 0;
  Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: { getUserMedia } });
  getUserMedia.mockImplementation(async () => stream);
  vi.stubGlobal('Worker', FakeWorker);
  vi.stubGlobal('requestAnimationFrame', vi.fn());
});
afterEach(() => { vi.unstubAllGlobals(); document.body.innerHTML = ''; });

it('stops a stream granted after the user cancelled camera startup', async () => {
  let grant!: (value: MediaStream) => void;
  getUserMedia.mockImplementation(() => new Promise((resolve) => { grant = resolve; }));
  const { input, video } = controller();
  const start = input.start();
  input.stop();
  grant(stream);
  await start;
  expect(stopTrack).toHaveBeenCalledOnce();
  expect(video.srcObject).toBeNull();
  expect(input.isActive()).toBe(false);
  expect(workers).toHaveLength(0);
});

it('settles worker startup immediately when stopped and permits a fresh start', async () => {
  const { input } = controller();
  const first = input.start();
  await Promise.resolve(); await Promise.resolve();
  expect(workers).toHaveLength(1);
  input.stop();
  await first;
  expect(workers[0].terminate).toHaveBeenCalledOnce();
  expect(stopTrack).toHaveBeenCalledOnce();
  const second = input.start();
  await Promise.resolve(); await Promise.resolve();
  workers[1].onmessage?.({ data: { type: 'ready' } } as MessageEvent);
  await second;
  expect(input.isActive()).toBe(true);
  input.stop();
  expect(stopTrack).toHaveBeenCalledTimes(2);
});

it('rejects a worker initialization error and releases the camera', async () => {
  const { input } = controller();
  const start = input.start();
  const failure = expect(start).rejects.toThrow('Model download failed');
  await Promise.resolve(); await Promise.resolve();
  workers[0].onmessage?.({ data: { type: 'error', message: 'Model download failed' } } as MessageEvent);
  await failure;
  expect(stopTrack).toHaveBeenCalledOnce();
  expect(workers[0].terminate).toHaveBeenCalledOnce();
  expect(input.isActive()).toBe(false);
});
