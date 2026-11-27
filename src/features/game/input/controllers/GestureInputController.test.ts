// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { GestureInputController, buildAnatomicalPalmOutline } from './GestureInputController';

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

it('builds a non-self-intersecting anatomical palm outline with thumb side aligned to index knuckle', () => {
  const pts = Array.from({ length: 21 }, () => ({ x: 500, y: 500 }));
  pts[0] = { x: 500, y: 540 }; // Wrist
  pts[1] = { x: 472, y: 520 }; // Thumb CMC (left side)
  pts[2] = { x: 458, y: 496 }; // Thumb MCP (left side)
  pts[5] = { x: 470, y: 475 }; // Index MCP (left side)
  pts[9] = { x: 492, y: 470 }; // Middle MCP
  pts[13] = { x: 514, y: 473 }; // Ring MCP
  pts[17] = { x: 534, y: 482 }; // Pinky MCP (right side)

  const { palmOutline } = buildAnatomicalPalmOutline(pts, 64);
  const wristThumbSide = palmOutline[0];
  const wristPinkySide = palmOutline[palmOutline.length - 1];

  // Wrist thumb side must stay on the same left side as Index MCP (5), never crossing to Pinky side!
  expect(wristThumbSide.x).toBeLessThan(pts[0].x);
  expect(wristPinkySide.x).toBeGreaterThan(pts[0].x);
});
