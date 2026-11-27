// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import {
  GestureInputController,
  buildAnatomicalPalmOutline,
  BUTTON_HOLD_DURATION_MS,
} from './GestureInputController';

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

function makeWebcamHand(cx: number, cy: number, pinched: boolean) {
  const pts = Array.from({ length: 21 }, () => ({ x: cx, y: cy }));
  pts[0] = { x: cx, y: cy + 0.14 };
  pts[5] = { x: cx - 0.08, y: cy + 0.02 };
  pts[9] = { x: cx, y: cy };
  pts[13] = { x: cx + 0.06, y: cy + 0.02 };
  pts[17] = { x: cx + 0.12, y: cy + 0.04 };
  // Open fingers by default
  pts[4] = pinched ? { x: cx - 0.04, y: cy - 0.08 } : { x: cx - 0.24, y: cy - 0.06 };
  pts[8] = pinched ? { x: cx - 0.04, y: cy - 0.08 } : { x: cx - 0.08, y: cy - 0.16 };
  pts[12] = { x: cx, y: cy - 0.18 };
  pts[16] = { x: cx + 0.06, y: cy - 0.16 };
  pts[20] = { x: cx + 0.12, y: cy - 0.14 };
  return pts;
}

it('allows grabbing a filled answer slot and pulling it back down to return the letter to the pool', () => {
  Object.defineProperty(window, 'innerWidth', { configurable: true, value: 1000 });
  Object.defineProperty(window, 'innerHeight', { configurable: true, value: 800 });

  const filledSlot = document.createElement('button');
  filledSlot.className = 'game-slot filled';
  filledSlot.dataset.index = '0';
  filledSlot.dataset.tileId = '7-0';
  filledSlot.dataset.letter = 'E';
  filledSlot.textContent = 'E';
  vi.spyOn(filledSlot, 'getBoundingClientRect').mockReturnValue({
    left: 460, top: 210, right: 530, bottom: 280, width: 70, height: 70, x: 460, y: 210, toJSON: () => ({}),
  } as DOMRect);
  document.body.appendChild(filledSlot);

  const onTileDrop = vi.fn();
  const { input } = controller();
  input.setEvents({ onTileDrop });

  // 1. Arm hand with open fingers near slot (x=0.5 -> screenX ~ 500, y=0.40 -> screenY ~ 296, index tip ~ 235)
  input.processDetectionFrame([makeWebcamHand(0.5, 0.4, false)], ['Right'], 100);
  // 2. Pinch on the filled slot
  input.processDetectionFrame([makeWebcamHand(0.5, 0.4, true)], ['Right'], 130);
  expect(filledSlot.classList.contains('drag-source')).toBe(true);

  // 3. Drag hand down toward letter bank (y=0.68 -> screenY ~ 580) and release fingers
  input.processDetectionFrame([makeWebcamHand(0.5, 0.68, true)], ['Right'], 160);
  input.processDetectionFrame([makeWebcamHand(0.5, 0.68, false)], ['Right'], 190);
  input.processDetectionFrame([makeWebcamHand(0.5, 0.68, false)], ['Right'], 220);

  expect(onTileDrop).toHaveBeenCalledWith({
    tileId: '7-0',
    letter: 'E',
    slotIndex: -1,
    fromSlotIndex: 0,
  });
});

it('auto-clicks a [data-gesture-hold] button after pinching and holding for ~2.2 seconds', () => {
  Object.defineProperty(window, 'innerWidth', { configurable: true, value: 1000 });
  Object.defineProperty(window, 'innerHeight', { configurable: true, value: 800 });

  const speakBtn = document.createElement('button');
  speakBtn.setAttribute('data-gesture-hold', 'speak');
  speakBtn.setAttribute('data-gesture-label', 'Nghe từ');
  speakBtn.textContent = 'Nghe từ';
  const onClick = vi.fn();
  speakBtn.addEventListener('click', onClick);
  vi.spyOn(speakBtn, 'getBoundingClientRect').mockReturnValue({
    left: 440, top: 200, right: 560, bottom: 260, width: 120, height: 60, x: 440, y: 200, toJSON: () => ({}),
  } as DOMRect);
  document.body.appendChild(speakBtn);

  const { input } = controller();

  // 1. Open hand over the Speak button, then pinch
  input.processDetectionFrame([makeWebcamHand(0.5, 0.38, false)], ['Right'], 1000);
  input.processDetectionFrame([makeWebcamHand(0.5, 0.38, true)], ['Right'], 1030);
  expect(speakBtn.classList.contains('hand-button-holding')).toBe(true);
  expect(onClick).not.toHaveBeenCalled();

  // 2. Hold for 1.5s -> not clicked yet
  input.processDetectionFrame([makeWebcamHand(0.5, 0.38, true)], ['Right'], 1030 + 1500);
  expect(onClick).not.toHaveBeenCalled();

  // 3. Hold past 2.2s -> auto-clicks once and releases hold cleanly!
  input.processDetectionFrame(
    [makeWebcamHand(0.5, 0.38, true)],
    ['Right'],
    1030 + BUTTON_HOLD_DURATION_MS + 50,
  );
  expect(onClick).toHaveBeenCalledTimes(1);
  expect(speakBtn.classList.contains('hand-button-holding')).toBe(false);
});
