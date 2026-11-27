import type { InputController, InputMode, InputControllerEvents } from './InputController';
import type { Point, GripTargetState } from '../utils/gestureRecognition';
import {
  projectNormalizedHandToScreen,
  gesturePoint,
  grabPoints,
  advanceGrip,
  assignHandSlots,
  nearestRectIndex,
  getPinchProgress,
} from '../utils/gestureRecognition';
import {
  filterHandLandmarks,
  smoothVisualLandmarks,
  stableDragPoint,
  type TrackingState,
} from '../utils/gestureSmoothing';

export interface HandDragItem {
  tile: HTMLElement;
  tileId: string;
  letter: string;
  fromSlotIndex?: number;
}

export interface HandButtonHold {
  button: HTMLButtonElement;
  label: string;
  startedAt: number;
  durationMs: number;
  progress: number;
}

interface ClickRippleEffect {
  x: number;
  y: number;
  startedAt: number;
  color: string;
}

export interface HandRuntimeState extends GripTargetState {
  id: number;
  ghost: HTMLDivElement;
  visible: boolean;
  lastWrist: Point | null;
  handLabel: string | null;
  lostFrames: number;
  targetLandmarks: Point[] | null;
  visualLandmarks: Point[] | null;
  lastVisualAt: number | null;
  tracking: TrackingState | null;
  dropPoint: Point | null;
  drag: HandDragItem | null;
  buttonHold: HandButtonHold | null;
  pinchProgress: number;
}

interface CachedControl {
  element: HTMLElement;
  rect: DOMRect;
}

const gloveFingers = [
  { chain: [17, 18, 19, 20], tip: 20, scale: 0.78, isPinchTip: false },
  { chain: [13, 14, 15, 16], tip: 16, scale: 0.88, isPinchTip: false },
  { chain: [9, 10, 11, 12], tip: 12, scale: 0.96, isPinchTip: false },
  { chain: [5, 6, 7, 8], tip: 8, scale: 0.94, isPinchTip: true },
  { chain: [1, 2, 3, 4], tip: 4, scale: 0.92, isPinchTip: true },
] as const;

/**
 * Bảng màu Găng tay 3D chuẩn DESIGN.md §2.4 (Signly Pastel & Royal Indigo — không dùng #000000)
 */
const glovePalettes = [
  {
    fabricTop: '#ffffff',
    fabric: '#eef2fa',
    fabricShade: '#dce3f5',
    seam: '#322c82',
    shadow: 'rgba(30, 26, 82, 0.22)',
    pad: '#211c61',
    accent: '#ff7b62',
    glow: '#ffdcd4',
    ringTrack: 'rgba(50, 44, 130, 0.24)',
  },
  {
    fabricTop: '#ffffff',
    fabric: '#d8f1e7',
    fabricShade: '#bde6d6',
    seam: '#19634b',
    shadow: 'rgba(19, 78, 58, 0.22)',
    pad: '#134e3a',
    accent: '#10b981',
    glow: '#a3e4cb',
    ringTrack: 'rgba(25, 99, 75, 0.24)',
  },
] as const;

const CAPTURE_MIN_INTERVAL_MS = 14;
const BITMAP_TARGET_WIDTH = 320;
const BITMAP_TARGET_HEIGHT = 240;
const CONTROL_CACHE_TTL_MS = 90;
export const BUTTON_HOLD_DURATION_MS = 2200; // Chụm giữ 2.2 giây trên nút sẽ tự động nhấn

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));
const pointDistance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);

function isPointNearRect(rect: DOMRect, x: number, y: number, padding: number): boolean {
  const dx = Math.max(rect.left - x, 0, x - rect.right);
  const dy = Math.max(rect.top - y, 0, y - rect.bottom);
  return Math.hypot(dx, dy) <= padding;
}

function traceRoundedPolygon(context: CanvasRenderingContext2D, points: Point[]): void {
  if (points.length < 3) return;
  const midpoint = (a: Point, b: Point) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
  const start = midpoint(points[points.length - 1], points[0]);
  context.beginPath();
  context.moveTo(start.x, start.y);
  for (let index = 0; index < points.length; index++) {
    const point = points[index];
    const next = points[(index + 1) % points.length];
    const middle = midpoint(point, next);
    context.quadraticCurveTo(point.x, point.y, middle.x, middle.y);
  }
  context.closePath();
}

function traceSmoothFingerChain(context: CanvasRenderingContext2D, chain: Point[]): void {
  if (chain.length < 2) return;
  context.beginPath();
  context.moveTo(chain[0].x, chain[0].y);
  for (let i = 1; i < chain.length - 1; i++) {
    const midX = (chain[i].x + chain[i + 1].x) / 2;
    const midY = (chain[i].y + chain[i + 1].y) / 2;
    context.quadraticCurveTo(chain[i].x, chain[i].y, midX, midY);
  }
  const last = chain[chain.length - 1];
  context.lineTo(last.x, last.y);
}

export function buildAnatomicalPalmOutline(points: Point[], palmSpan: number): {
  palmOutline: Point[];
  cuffCorners: Point[];
  palmCenter: Point;
} {
  const wrist = points[0];
  const rawAcrossLen = Math.max(1, pointDistance(points[5], points[17]));
  const across = {
    x: (points[17].x - points[5].x) / rawAcrossLen,
    y: (points[17].y - points[5].y) / rawAcrossLen,
  };

  const knucklesCenter = {
    x: (points[5].x + points[9].x + points[13].x + points[17].x) / 4,
    y: (points[5].y + points[9].y + points[13].y + points[17].y) / 4,
  };
  const upLen = Math.max(1, pointDistance(wrist, knucklesCenter));
  const upAxis = {
    x: (knucklesCenter.x - wrist.x) / upLen,
    y: (knucklesCenter.y - wrist.y) / upLen,
  };

  const wristThumbSide = {
    x: wrist.x - across.x * (palmSpan * 0.31) - upAxis.x * (palmSpan * 0.03),
    y: wrist.y - across.y * (palmSpan * 0.31) - upAxis.y * (palmSpan * 0.03),
  };
  const wristPinkySide = {
    x: wrist.x + across.x * (palmSpan * 0.34) - upAxis.x * (palmSpan * 0.03),
    y: wrist.y + across.y * (palmSpan * 0.34) - upAxis.y * (palmSpan * 0.03),
  };

  const thumbWeb = {
    x: points[2].x * 0.48 + points[5].x * 0.52,
    y: points[2].y * 0.48 + points[5].y * 0.52,
  };
  const pinkyEdge = {
    x: (points[17].x + wristPinkySide.x) * 0.5 + across.x * (palmSpan * 0.07),
    y: (points[17].y + wristPinkySide.y) * 0.5 + across.y * (palmSpan * 0.07),
  };

  const palmOutline: Point[] = [
    wristThumbSide,
    points[1],
    thumbWeb,
    points[5],
    points[9],
    points[13],
    points[17],
    pinkyEdge,
    wristPinkySide,
  ];

  const cuffDepth = palmSpan * 0.24;
  const cuffOuterCenter = {
    x: wrist.x - upAxis.x * cuffDepth,
    y: wrist.y - upAxis.y * cuffDepth,
  };
  const cuffCorners: Point[] = [
    {
      x: wristThumbSide.x + upAxis.x * (palmSpan * 0.02),
      y: wristThumbSide.y + upAxis.y * (palmSpan * 0.02),
    },
    {
      x: wristPinkySide.x + upAxis.x * (palmSpan * 0.02),
      y: wristPinkySide.y + upAxis.y * (palmSpan * 0.02),
    },
    {
      x: cuffOuterCenter.x + across.x * (palmSpan * 0.36),
      y: cuffOuterCenter.y + across.y * (palmSpan * 0.36),
    },
    {
      x: cuffOuterCenter.x - across.x * (palmSpan * 0.33),
      y: cuffOuterCenter.y - across.y * (palmSpan * 0.33),
    },
  ];

  const palmCenter = {
    x: (wrist.x + points[5].x + points[9].x + points[13].x + points[17].x) / 5,
    y: (wrist.y + points[5].y + points[9].y + points[13].y + points[17].y) / 5,
  };

  return { palmOutline, cuffCorners, palmCenter };
}

export class GestureInputController implements InputController {
  readonly mode: InputMode = 'gesture';
  private events: InputControllerEvents = {};
  private active = false;

  private video: HTMLVideoElement | null = null;
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private stream: MediaStream | null = null;
  private worker: Worker | null = null;
  private startPromise: Promise<void> | null = null;
  private cancelWorkerStart: (() => void) | null = null;

  private cameraGeneration = 0;
  private framePending = false;
  private lastCaptureAt = 0;
  private lastVideoTime = -1;
  private handVisualDirty = false;
  private handMissUntil = 0;

  private inferenceFrames = 0;
  private lastFpsCheck = 0;

  private cachedTiles: CachedControl[] = [];
  private cachedSlots: CachedControl[] = [];
  private cachedActionButtons: CachedControl[] = [];
  private tilesContainerEl: HTMLElement | null = null;
  private tilesContainerRect: DOMRect | null = null;
  private controlCacheAt = 0;

  private hoveredTiles: [HTMLElement | null, HTMLElement | null] = [null, null];
  private targetedSlots: [HTMLElement | null, HTMLElement | null] = [null, null];
  private hoveredButtons: [HTMLElement | null, HTMLElement | null] = [null, null];
  private clickRipples: ClickRippleEffect[] = [];

  private handStates: HandRuntimeState[] = [
    this.createHandState(0),
    this.createHandState(1),
  ];

  constructor(
    videoElement?: HTMLVideoElement | null,
    canvasElement?: HTMLCanvasElement | null,
    events?: InputControllerEvents,
  ) {
    if (videoElement) this.video = videoElement;
    if (canvasElement) {
      this.canvas = canvasElement;
      this.ctx = canvasElement.getContext('2d');
    }
    if (events) this.events = events;
  }

  setElements(video: HTMLVideoElement, canvas: HTMLCanvasElement): void {
    this.video = video;
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
  }

  setEvents(events: InputControllerEvents): void {
    this.events = events;
  }

  isActive(): boolean {
    return this.active;
  }

  private createHandState(id: number): HandRuntimeState {
    let ghost = (typeof document !== 'undefined'
      ? document.getElementById(`drag-ghost-hand-${id}`)
      : null) as HTMLDivElement | null;
    if (!ghost && typeof document !== 'undefined') {
      ghost = document.createElement('div');
      ghost.id = `drag-ghost-hand-${id}`;
      ghost.className = `drag-ghost hand-ghost hand-ghost-${id}`;
      ghost.hidden = true;
      ghost.setAttribute('aria-hidden', 'true');
      document.body.appendChild(ghost);
    }
    return {
      id,
      ghost: ghost!,
      visible: false,
      lastWrist: null,
      handLabel: null,
      lostFrames: 0,
      targetLandmarks: null,
      visualLandmarks: null,
      lastVisualAt: null,
      tracking: null,
      heldGesture: null,
      readyPair: null,
      readyPairs: [],
      pendingPair: null,
      readyType: null,
      directArmed: true,
      closeFrames: 0,
      openFrames: 0,
      dropPoint: null,
      drag: null,
      buttonHold: null,
      pinchProgress: 0,
    };
  }

  async start(): Promise<void> {
    if (this.active) return;
    if (this.startPromise) return this.startPromise;
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error('Trình duyệt không hỗ trợ truy cập camera');
    }
    const generation = ++this.cameraGeneration;
    const task = this.startCamera(generation);
    this.startPromise = task;
    try {
      await task;
    } finally {
      if (this.startPromise === task) this.startPromise = null;
    }
  }

  private async startCamera(generation: number): Promise<void> {
    this.events.onStatusChange?.('Đang yêu cầu quyền camera...');

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          facingMode: 'user',
          width: { ideal: 640 },
          height: { ideal: 480 },
          frameRate: { ideal: 60 },
        },
      });
      if (generation !== this.cameraGeneration) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      this.stream = stream;

      if (this.video) {
        this.video.srcObject = stream;
        await this.video.play();
      }
      if (generation !== this.cameraGeneration) return;

      this.events.onStatusChange?.('Đang khởi tạo AI nhận diện tay (GPU)...');
      await this.initWorker();
      if (generation !== this.cameraGeneration) return;

      this.active = true;
      const gen = generation;
      this.framePending = false;
      this.lastCaptureAt = 0;
      this.lastVideoTime = -1;
      this.lastFpsCheck = performance.now();
      this.inferenceFrames = 0;
      this.handVisualDirty = false;
      this.handMissUntil = 0;
      this.clickRipples = [];
      this.invalidateControlCache();

      this.resizeCanvas();
      window.addEventListener('resize', this.handleResize);
      window.addEventListener('scroll', this.handleScroll, { passive: true });

      this.events.onStatusChange?.('Đưa bàn tay vào khung hình để bắt đầu');
      requestAnimationFrame((now) => this.loop(now, gen));
    } catch (err: unknown) {
      if (generation !== this.cameraGeneration) return;
      this.stop();
      throw err;
    }
  }

  stop(): void {
    this.active = false;
    this.cameraGeneration++;
    this.startPromise = null;
    this.cancelWorkerStart?.();
    this.cancelWorkerStart = null;
    window.removeEventListener('resize', this.handleResize);
    window.removeEventListener('scroll', this.handleScroll);

    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }

    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop());
      this.stream = null;
    }

    if (this.video) {
      this.video.srcObject = null;
    }

    if (this.ctx && this.canvas) {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }

    this.handStates.forEach((state) => {
      this.resetHand(state);
    });

    this.clickRipples = [];
    this.clearAllHighlights();
    this.invalidateControlCache();

    this.events.onStatusChange?.('Đã tắt nhận diện tay');
  }

  private handleResize = () => {
    this.resizeCanvas();
    this.invalidateControlCache();
    this.handVisualDirty = true;
  };

  private handleScroll = () => {
    this.invalidateControlCache();
  };

  private invalidateControlCache(): void {
    this.controlCacheAt = 0;
    this.cachedTiles = [];
    this.cachedSlots = [];
    this.cachedActionButtons = [];
    this.tilesContainerEl = null;
    this.tilesContainerRect = null;
  }

  private refreshControlCacheIfNeeded(now: number): void {
    if (typeof document === 'undefined') return;
    if (
      this.controlCacheAt > 0 &&
      now - this.controlCacheAt < CONTROL_CACHE_TTL_MS &&
      this.cachedTiles.every((item) => item.element.isConnected) &&
      this.cachedSlots.every((item) => item.element.isConnected) &&
      this.cachedActionButtons.every((item) => item.element.isConnected)
    ) {
      return;
    }
    this.controlCacheAt = now;
    this.cachedTiles = Array.from(
      document.querySelectorAll<HTMLElement>('.game-tile:not(.used):not(.drag-source)'),
    ).map((element) => ({ element, rect: element.getBoundingClientRect() }));

    this.cachedSlots = Array.from(
      document.querySelectorAll<HTMLElement>('.game-slot'),
    ).map((element) => ({ element, rect: element.getBoundingClientRect() }));

    this.cachedActionButtons = Array.from(
      document.querySelectorAll<HTMLButtonElement>('button[data-gesture-hold]:not(:disabled)'),
    ).map((element) => ({ element, rect: element.getBoundingClientRect() }));

    this.tilesContainerEl = document.querySelector<HTMLElement>('.tiles-container');
    this.tilesContainerRect = this.tilesContainerEl?.getBoundingClientRect() ?? null;
  }

  private findNearestGrabSource(x: number, y: number, padding: number, now: number): HTMLElement | null {
    this.refreshControlCacheIfNeeded(now);
    const availableTiles = this.cachedTiles.filter(
      (item) =>
        item.element.isConnected &&
        !item.element.classList.contains('used') &&
        !item.element.classList.contains('drag-source'),
    );
    const availableFilledSlots = this.cachedSlots.filter(
      (item) =>
        item.element.isConnected &&
        item.element.classList.contains('filled') &&
        !item.element.classList.contains('drag-source'),
    );
    const combined = [...availableTiles, ...availableFilledSlots];
    if (!combined.length) return null;
    const idx = nearestRectIndex(
      combined.map((item) => item.rect),
      x,
      y,
      padding,
    );
    return idx < 0 ? null : combined[idx].element;
  }

  private findNearestDropSlot(
    x: number,
    y: number,
    padding: number,
    now: number,
    fromSlotIndex?: number,
  ): HTMLElement | null {
    this.refreshControlCacheIfNeeded(now);
    const available = this.cachedSlots.filter((item) => {
      if (!item.element.isConnected) return false;
      const slotIdx = parseInt(item.element.dataset.index || '-1', 10);
      // Khi đang kéo từ 1 ô đáp án, cho phép thả sang ô trống hoặc hoán đổi với 1 ô khác (khác ô gốc)
      if (typeof fromSlotIndex === 'number' && fromSlotIndex >= 0) {
        return slotIdx >= 0 && slotIdx !== fromSlotIndex;
      }
      return !item.element.classList.contains('filled');
    });
    if (!available.length) return null;
    const idx = nearestRectIndex(
      available.map((item) => item.rect),
      x,
      y,
      padding,
    );
    return idx < 0 ? null : available[idx].element;
  }

  private findNearestActionButton(
    x: number,
    y: number,
    padding: number,
    now: number,
  ): HTMLButtonElement | null {
    this.refreshControlCacheIfNeeded(now);
    const available = this.cachedActionButtons.filter(
      (item) => item.element.isConnected && !(item.element as HTMLButtonElement).disabled,
    );
    if (!available.length) return null;
    const idx = nearestRectIndex(
      available.map((item) => item.rect),
      x,
      y,
      padding,
    );
    return idx < 0 ? null : (available[idx].element as HTMLButtonElement);
  }

  private updateHandHighlight(
    handId: number,
    nextTileOrFilledSlot: HTMLElement | null,
    nextTargetSlot: HTMLElement | null,
    nextActionButton: HTMLElement | null,
  ): void {
    const prevTile = this.hoveredTiles[handId];
    if (prevTile !== nextTileOrFilledSlot) {
      prevTile?.classList.remove(`hand-hover-${handId}`);
      nextTileOrFilledSlot?.classList.add(`hand-hover-${handId}`);
      this.hoveredTiles[handId] = nextTileOrFilledSlot;
    }

    const prevSlot = this.targetedSlots[handId];
    if (prevSlot !== nextTargetSlot) {
      prevSlot?.classList.remove(`hand-target-${handId}`);
      nextTargetSlot?.classList.add(`hand-target-${handId}`);
      this.targetedSlots[handId] = nextTargetSlot;
    }

    const prevBtn = this.hoveredButtons[handId];
    if (prevBtn !== nextActionButton) {
      prevBtn?.classList.remove('hand-button-hover');
      nextActionButton?.classList.add('hand-button-hover');
      this.hoveredButtons[handId] = nextActionButton;
    }
  }

  private updateReturnPoolHighlight(isReturningToPool: boolean): void {
    if (!this.tilesContainerEl && typeof document !== 'undefined') {
      this.tilesContainerEl = document.querySelector<HTMLElement>('.tiles-container');
    }
    this.tilesContainerEl?.classList.toggle('hand-return-target', isReturningToPool);
  }

  private clearAllHighlights(): void {
    for (let id = 0; id < 2; id++) {
      this.updateHandHighlight(id, null, null, null);
    }
    this.updateReturnPoolHighlight(false);
    if (typeof document !== 'undefined') {
      document.querySelectorAll<HTMLElement>('.game-slot').forEach((slot) => {
        slot.classList.remove('hand-target-0', 'hand-target-1', 'hand-hover-0', 'hand-hover-1', 'drag-source');
      });
      document.querySelectorAll<HTMLElement>('.game-tile').forEach((tile) => {
        tile.classList.remove('hand-hover-0', 'hand-hover-1', 'drag-source');
      });
      document.querySelectorAll<HTMLElement>('button[data-gesture-hold]').forEach((btn) => {
        btn.classList.remove('hand-button-hover', 'hand-button-holding');
      });
    }
  }

  private initWorker(): Promise<void> {
    return new Promise((resolve, reject) => {
      const worker = new Worker('/workers/hand-worker.js');
      this.worker = worker;
      let ready = false;
      const fail = (error: Error) => {
        clearTimeout(timeout);
        this.cancelWorkerStart = null;
        reject(error);
      };
      const timeout = setTimeout(() => fail(new Error('Tải mô hình nhận diện tay quá hạn (timeout)')), 25000);
      this.cancelWorkerStart = () => fail(new DOMException('Đã hủy bật camera', 'AbortError'));

      worker.onmessage = ({ data }: MessageEvent) => {
        if (worker !== this.worker) return;
        if (data.type === 'ready') {
          clearTimeout(timeout);
          this.cancelWorkerStart = null;
          ready = true;
          resolve();
          return;
        }
        if (data.type === 'result') {
          this.framePending = false;
          if (this.active) {
            this.handleDetectionResult(data.landmarks || [], data.labels || [], data.timestamp);
          }
          return;
        }
        if (data.type === 'error') {
          clearTimeout(timeout);
          this.framePending = false;
          const message = data.message || 'Lỗi nhận diện';
          if (ready) this.events.onError?.(message);
          else fail(new Error(message));
        }
      };

      worker.onerror = (ev) => {
        clearTimeout(timeout);
        this.framePending = false;
        const message = ev.message || 'Lỗi Worker nhận diện';
        if (ready) this.events.onError?.(message);
        else fail(new Error(message));
      };

      worker.postMessage({ type: 'init' });
    });
  }

  private handAim(state: HandRuntimeState): Point | null {
    return gesturePoint(state.visualLandmarks || state.targetLandmarks, state.heldGesture);
  }

  private anchorCandidates(state: HandRuntimeState): Point[] {
    const screenW = window.innerWidth;
    const screenH = window.innerHeight;
    const measuredLandmarks = state.tracking?.raw
      ? projectNormalizedHandToScreen(state.tracking.raw, screenW, screenH)
      : null;

    return [
      ...grabPoints(state.targetLandmarks, state.heldGesture),
      ...(measuredLandmarks ? grabPoints(measuredLandmarks, state.heldGesture) : []),
    ];
  }

  private beginHandDrag(state: HandRuntimeState, now: number): boolean {
    const point = gesturePoint(state.targetLandmarks, state.heldGesture);
    if (!point) return false;

    this.invalidateControlCache();
    const points = this.anchorCandidates(state);
    const padding = 44;

    let foundEl: HTMLElement | null = null;
    for (const anchor of points) {
      const candidate = this.findNearestGrabSource(anchor.x, anchor.y, padding, now);
      if (candidate) {
        foundEl = candidate;
        break;
      }
    }

    if (!foundEl || foundEl.classList.contains('used') || foundEl.classList.contains('drag-source')) {
      return false;
    }

    const isFromFilledSlot = foundEl.classList.contains('game-slot') && foundEl.classList.contains('filled');
    const fromSlotIndex = isFromFilledSlot ? parseInt(foundEl.dataset.index || '-1', 10) : undefined;
    const tileId = isFromFilledSlot
      ? foundEl.dataset.tileId || ''
      : foundEl.dataset.id || '';
    const letter = foundEl.dataset.letter || foundEl.querySelector('span')?.textContent?.trim() || foundEl.textContent?.trim() || '';

    if (!letter) return false;

    state.drag = { tile: foundEl, tileId, letter, fromSlotIndex };
    state.dropPoint = point;
    foundEl.classList.add('drag-source');
    this.invalidateControlCache();

    state.ghost.textContent = letter;
    state.ghost.hidden = false;
    state.ghost.style.left = `${point.x}px`;
    state.ghost.style.top = `${point.y}px`;

    this.events.onTileGrab?.({ x: point.x, y: point.y, handId: state.id });
    return true;
  }

  private beginButtonHold(state: HandRuntimeState, now: number): boolean {
    this.invalidateControlCache();
    const points = this.anchorCandidates(state);
    let foundButton: HTMLButtonElement | null = null;

    for (const anchor of points) {
      const btn = this.findNearestActionButton(anchor.x, anchor.y, 32, now);
      if (btn) {
        foundButton = btn;
        break;
      }
    }

    if (!foundButton || foundButton.disabled) return false;

    const label =
      foundButton.dataset.gestureLabel ||
      foundButton.textContent?.trim() ||
      foundButton.getAttribute('aria-label') ||
      'nút';

    state.buttonHold = {
      button: foundButton,
      label,
      startedAt: now,
      durationMs: BUTTON_HOLD_DURATION_MS,
      progress: 0,
    };
    foundButton.classList.add('hand-button-holding');
    return true;
  }

  private cancelButtonHold(state: HandRuntimeState): void {
    if (!state.buttonHold) return;
    state.buttonHold.button.classList.remove('hand-button-holding');
    state.buttonHold = null;
  }

  private updateActiveButtonHold(state: HandRuntimeState, now: number): void {
    const hold = state.buttonHold;
    if (!hold) return;

    if (!hold.button.isConnected || hold.button.disabled || !state.heldGesture) {
      this.cancelButtonHold(state);
      return;
    }

    const aim = this.handAim(state) || gesturePoint(state.targetLandmarks, state.heldGesture);
    const rect = hold.button.getBoundingClientRect();
    // Cho phép biên độ rung tay tự nhiên 42px quanh nút trong lúc giữ 2.2 giây
    if (!aim || !isPointNearRect(rect, aim.x, aim.y, 42)) {
      this.cancelButtonHold(state);
      this.rejectUnattachedGrip(state);
      this.events.onStatusChange?.('Đã hủy nhấn nút do đưa tay ra ngoài');
      return;
    }

    const elapsed = Math.max(0, now - hold.startedAt);
    hold.progress = clamp(elapsed / hold.durationMs, 0, 1);

    const remainingSec = Math.max(0, (hold.durationMs - elapsed) / 1000).toFixed(1);
    this.events.onStatusChange?.(`Giữ chụm tay để nhấn "${hold.label}" (${remainingSec}s)...`);

    if (hold.progress >= 1) {
      const targetBtn = hold.button;
      const btnLabel = hold.label;
      const center = {
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2,
      };
      const palette = glovePalettes[state.id] || glovePalettes[0];

      this.cancelButtonHold(state);
      this.rejectUnattachedGrip(state);
      this.invalidateControlCache();

      this.clickRipples.push({
        x: aim.x || center.x,
        y: aim.y || center.y,
        startedAt: now,
        color: palette.accent,
      });

      targetBtn.click();
      this.events.onStatusChange?.(`Đã nhấn "${btnLabel}"!`);
      this.handVisualDirty = true;
    }
  }

  private rejectUnattachedGrip(state: HandRuntimeState): void {
    state.heldGesture = null;
    state.readyPair = null;
    state.readyPairs = [];
    state.pendingPair = null;
    state.readyType = null;
    state.directArmed = false;
    state.closeFrames = 0;
    state.openFrames = 0;
  }

  private finishHandDrag(state: HandRuntimeState, x: number, y: number, cancelled: boolean = false): void {
    if (!state.drag) return;
    const { tile, tileId, letter, fromSlotIndex } = state.drag;
    state.drag = null;
    state.dropPoint = null;
    tile.classList.remove('drag-source');
    state.ghost.hidden = true;

    this.updateHandHighlight(state.id, null, null, null);
    this.updateReturnPoolHighlight(false);
    this.invalidateControlCache();

    if (!cancelled && x >= 0 && y >= 0) {
      const slot = this.findNearestDropSlot(x, y, 42, performance.now(), fromSlotIndex);
      if (slot) {
        const slotIndex = parseInt(slot.dataset.index || '-1', 10);
        if (slotIndex >= 0) {
          this.events.onTileDrop?.({ tileId, letter, slotIndex, fromSlotIndex });
          this.invalidateControlCache();
        }
      } else if (typeof fromSlotIndex === 'number' && fromSlotIndex >= 0) {
        // Kéo từ ô đáp án trên cao xuống kho chữ / thả ngoài các ô khác -> gỡ chữ trả về kho!
        this.events.onTileDrop?.({ tileId, letter, slotIndex: -1, fromSlotIndex });
        this.invalidateControlCache();
      }
    }
    this.events.onTileRelease?.({ x, y, handId: state.id });
  }

  private resetHand(state: HandRuntimeState): void {
    this.finishHandDrag(state, -1, -1, true);
    this.cancelButtonHold(state);
    this.updateHandHighlight(state.id, null, null, null);
    state.visible = false;
    state.lastWrist = null;
    state.handLabel = null;
    state.targetLandmarks = null;
    state.visualLandmarks = null;
    state.lastVisualAt = null;
    state.tracking = null;
    state.heldGesture = null;
    state.dropPoint = null;
    state.readyPair = null;
    state.readyPairs = [];
    state.pendingPair = null;
    state.readyType = null;
    state.directArmed = true;
    state.closeFrames = 0;
    state.openFrames = 0;
    state.lostFrames = 0;
    state.pinchProgress = 0;
  }

  public processDetectionFrame(
    landmarkSets: Point[][],
    labels: (string | null)[],
    timestamp: number = performance.now(),
  ): void {
    this.handleDetectionResult(landmarkSets, labels, timestamp);
  }

  private handleDetectionResult(
    landmarkSets: Point[][],
    labels: (string | null)[],
    timestamp: number = performance.now(),
  ): void {
    this.inferenceFrames++;
    const now = Number.isFinite(timestamp) ? timestamp : performance.now();

    const assignments = assignHandSlots(
      landmarkSets,
      this.handStates.map((s) => s.lastWrist),
      labels,
      this.handStates.map((s) => s.handLabel),
      this.handStates.map((s) => Boolean(s.drag || s.buttonHold)),
    );

    const screenW = window.innerWidth;
    const screenH = window.innerHeight;

    for (let index = 0; index < this.handStates.length; index++) {
      const state = this.handStates[index];
      const assigned = assignments[index];

      if (assigned == null) {
        if (state.visible && ++state.lostFrames > 7) {
          this.resetHand(state);
        }
        continue;
      }

      const rawLandmarks = landmarkSets[assigned];
      const filtered = filterHandLandmarks(state, rawLandmarks, now);
      if (!filtered) continue;

      state.visible = true;
      state.lostFrames = 0;
      state.lastWrist = filtered[0];
      if (labels[assigned] && !state.handLabel) state.handLabel = labels[assigned];

      state.targetLandmarks = projectNormalizedHandToScreen(filtered, screenW, screenH);
      state.visualLandmarks ||= state.targetLandmarks.map((p) => ({ ...p }));

      const activePair =
        state.heldGesture?.type === 'pinch'
          ? state.heldGesture.pair
          : state.pendingPair || state.readyPair;
      state.pinchProgress = getPinchProgress(state.tracking?.raw || filtered, activePair);

      const releasePoint = gesturePoint(state.targetLandmarks, state.heldGesture);
      if (releasePoint) {
        this.events.onCursorMove?.({ x: releasePoint.x, y: releasePoint.y, handId: state.id });
      }

      if (state.tracking?.raw) {
        const transition = advanceGrip(
          state,
          state.tracking.raw,
          Boolean(state.drag),
          Boolean(state.buttonHold),
        );

        if (transition.ended) {
          if (state.buttonHold) {
            this.cancelButtonHold(state);
          }
          const point = state.dropPoint || releasePoint;
          this.finishHandDrag(state, point?.x ?? -1, point?.y ?? -1, false);
        } else if (transition.started) {
          if (!this.beginHandDrag(state, now) && !this.beginButtonHold(state, now)) {
            this.rejectUnattachedGrip(state);
            this.handMissUntil = now + 1500;
          }
        }
      }

      if (state.buttonHold) {
        this.updateActiveButtonHold(state, now);
      }
    }

    const activeHold = this.handStates.find((s) => s.buttonHold)?.buttonHold;
    if (!activeHold) {
      const draggingState = this.handStates.find((s) => s.drag);
      const isAnyHolding = this.handStates.some((s) => s.heldGesture);
      const isMissed = now < this.handMissUntil;

      let status = 'Đưa bàn tay vào khung hình';
      if (draggingState?.drag) {
        status =
          typeof draggingState.drag.fromSlotIndex === 'number'
            ? 'Kéo xuống kho chữ để gỡ hoặc thả sang ô khác'
            : 'Đang giữ chữ — thả ngón trên ô trống';
      } else if (isAnyHolding) {
        status = 'Đã nhận cử chỉ gắp';
      } else if (isMissed) {
        status = 'Đặt vòng ngắm lên chữ cái hoặc nút rồi chụm ngón';
      } else if (landmarkSets.length === 2) {
        status = 'Đã nhận diện 2 bàn tay';
      } else if (landmarkSets.length === 1) {
        const ready = this.handStates.some((s) => s.readyPair);
        status = ready
          ? 'Gắp chữ để kéo, hoặc giữ chụm 2.2s trên nút để nhấn'
          : 'Mở nhẹ ngón cái–trỏ để chuẩn bị thao tác';
      }
      this.events.onStatusChange?.(status);
    }

    this.handVisualDirty = true;
  }

  private loop = (now: number, gen: number) => {
    if (!this.active || gen !== this.cameraGeneration) return;

    if (now - this.lastFpsCheck >= 1000) {
      const currentFps = Math.round((this.inferenceFrames * 1000) / (now - this.lastFpsCheck));
      if (currentFps > 0 || this.video?.readyState === 4) {
        this.events.onFpsUpdate?.(currentFps);
      }
      this.inferenceFrames = 0;
      this.lastFpsCheck = now;
    }

    let visualMoved = false;
    let hasActiveHoldOrRipple = this.clickRipples.length > 0;

    for (const state of this.handStates) {
      if (!state.visible || !state.targetLandmarks) continue;
      if (state.buttonHold) {
        this.updateActiveButtonHold(state, now);
        hasActiveHoldOrRipple = true;
      }
      const elapsed = state.lastVisualAt == null ? 12 : now - state.lastVisualAt;
      const next = smoothVisualLandmarks(
        state.visualLandmarks,
        state.targetLandmarks,
        elapsed,
        Boolean(state.drag || state.buttonHold),
      );
      if (next) {
        visualMoved ||= next.some(
          (p, i) => !state.visualLandmarks || p.x !== state.visualLandmarks[i].x || p.y !== state.visualLandmarks[i].y,
        );
        state.visualLandmarks = next;
      }
      state.lastVisualAt = now;
    }

    if (this.handVisualDirty || visualMoved || hasActiveHoldOrRipple) {
      let anyReturningToPool = false;

      for (const state of this.handStates) {
        if (!state.visible) {
          this.updateHandHighlight(state.id, null, null, null);
          continue;
        }

        if (state.drag && state.visualLandmarks) {
          const dragPt = stableDragPoint(state, state.visualLandmarks);
          if (dragPt) {
            state.ghost.style.left = `${dragPt.x}px`;
            state.ghost.style.top = `${dragPt.y}px`;
          }
        }

        const aimPoint = state.drag
          ? state.dropPoint || this.handAim(state)
          : this.handAim(state);

        if (!aimPoint) {
          this.updateHandHighlight(state.id, null, null, null);
          continue;
        }

        if (state.drag) {
          const slot = this.findNearestDropSlot(aimPoint.x, aimPoint.y, 42, now, state.drag.fromSlotIndex);
          this.updateHandHighlight(state.id, null, slot, null);
          if (!slot && typeof state.drag.fromSlotIndex === 'number' && state.drag.fromSlotIndex >= 0) {
            if (!this.tilesContainerRect || isPointNearRect(this.tilesContainerRect, aimPoint.x, aimPoint.y, 120)) {
              anyReturningToPool = true;
            }
          }
        } else if (state.buttonHold) {
          this.updateHandHighlight(state.id, null, null, state.buttonHold.button);
        } else {
          const grabTarget = this.findNearestGrabSource(aimPoint.x, aimPoint.y, 30, now);
          const actionBtn = grabTarget ? null : this.findNearestActionButton(aimPoint.x, aimPoint.y, 26, now);
          this.updateHandHighlight(state.id, grabTarget, null, actionBtn);
        }
      }

      this.updateReturnPoolHighlight(anyReturningToPool);
      this.drawVirtualHands(now);
      this.handVisualDirty = false;
    }

    if (
      !this.framePending &&
      now - this.lastCaptureAt >= CAPTURE_MIN_INTERVAL_MS &&
      this.video &&
      this.video.readyState >= 2 &&
      this.video.currentTime !== this.lastVideoTime
    ) {
      this.lastCaptureAt = now;
      this.lastVideoTime = this.video.currentTime;
      void this.captureFrame(now, gen);
    }

    requestAnimationFrame((time) => this.loop(time, gen));
  };

  private async captureFrame(timestamp: number, gen: number): Promise<void> {
    if (!this.video) return;
    this.framePending = true;
    try {
      let bitmap: ImageBitmap;
      try {
        bitmap = await createImageBitmap(this.video, {
          resizeWidth: BITMAP_TARGET_WIDTH,
          resizeHeight: BITMAP_TARGET_HEIGHT,
          resizeQuality: 'low',
        });
      } catch {
        bitmap = await createImageBitmap(this.video);
      }
      if (!this.active || gen !== this.cameraGeneration || !this.worker) {
        bitmap.close();
        this.framePending = false;
        return;
      }
      this.worker.postMessage({ type: 'frame', bitmap, timestamp }, [bitmap]);
    } catch {
      this.framePending = false;
    }
  }

  private resizeCanvas(): void {
    if (!this.canvas) return;
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = Math.round(window.innerWidth * ratio);
    this.canvas.height = Math.round(window.innerHeight * ratio);
    if (this.ctx) {
      this.ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    }
  }

  private drawVirtualHands(now: number = performance.now()): void {
    if (!this.ctx || !this.canvas) return;
    this.ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

    this.drawClickRipples(now);

    for (const state of this.handStates) {
      if (!state.visible || !state.visualLandmarks) continue;
      this.drawGloveHand(state);
    }
  }

  private drawClickRipples(now: number): void {
    if (!this.ctx || !this.clickRipples.length) return;
    const ctx = this.ctx;
    const duration = 420;
    this.clickRipples = this.clickRipples.filter((r) => now - r.startedAt < duration);

    for (const ripple of this.clickRipples) {
      const t = clamp((now - ripple.startedAt) / duration, 0, 1);
      const radius = 16 + t * 38;
      ctx.save();
      ctx.globalAlpha = (1 - t) * 0.85;
      ctx.beginPath();
      ctx.arc(ripple.x, ripple.y, radius, 0, Math.PI * 2);
      ctx.strokeStyle = ripple.color;
      ctx.lineWidth = 4 * (1 - t * 0.5);
      ctx.stroke();
      ctx.restore();
    }
  }

  private drawGloveHand(state: HandRuntimeState): void {
    if (!this.ctx || !state.visualLandmarks) return;
    const ctx = this.ctx;
    const points = state.visualLandmarks;
    const palette = glovePalettes[state.id] || glovePalettes[0];
    const isGrabbing = Boolean(state.drag || state.heldGesture);
    const isHoveringTarget = Boolean(
      this.hoveredTiles[state.id] || this.targetedSlots[state.id] || this.hoveredButtons[state.id],
    );

    // Kích thước bàn tay 3D lớn hơn (~1.65x), nổi bật, cân đối hoàn hảo với khối chữ cái 66px
    const palmSpan = clamp(pointDistance(points[5], points[17]), 84, 148);
    const fingerWidth = clamp(palmSpan * 0.228, 19, 32);
    const seamWidth = 2.8;

    const { palmOutline, cuffCorners, palmCenter } = buildAnatomicalPalmOutline(points, palmSpan);
    const fingerChains = gloveFingers.map((finger) => ({
      ...finger,
      width: fingerWidth * finger.scale,
      pts: finger.chain.map((idx) => points[idx]),
    }));

    ctx.save();
    ctx.globalAlpha = state.lostFrames ? 0.42 : isGrabbing ? 0.95 : 0.88;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Lớp 0: Bóng cứng 3D Tactile (+5px trục Y chuẩn Signly)
    ctx.save();
    ctx.translate(0, 5);
    ctx.fillStyle = palette.shadow;
    ctx.strokeStyle = palette.shadow;
    traceRoundedPolygon(ctx, palmOutline);
    ctx.fill();
    traceRoundedPolygon(ctx, cuffCorners);
    ctx.fill();
    for (const f of fingerChains) {
      traceSmoothFingerChain(ctx, f.pts);
      ctx.lineWidth = f.width + seamWidth * 2;
      ctx.stroke();
    }
    ctx.restore();

    // Lớp 1: Viền ngoài liền khối (Unified Seam Silhouette)
    ctx.fillStyle = palette.seam;
    ctx.strokeStyle = palette.seam;
    if (isGrabbing) {
      ctx.shadowColor = palette.glow;
      ctx.shadowBlur = 18;
    }

    traceRoundedPolygon(ctx, palmOutline);
    ctx.lineWidth = seamWidth * 2;
    ctx.fill();
    ctx.stroke();

    for (const f of fingerChains) {
      traceSmoothFingerChain(ctx, f.pts);
      ctx.lineWidth = f.width + seamWidth * 2;
      ctx.stroke();
    }

    ctx.shadowBlur = 0;

    // Lớp 2: Vải găng tay Pastel 3D liền mạch
    const gloveGrad = ctx.createLinearGradient(
      points[9].x,
      points[9].y - palmSpan * 0.4,
      points[0].x,
      points[0].y + palmSpan * 0.3,
    );
    gloveGrad.addColorStop(0, palette.fabricTop);
    gloveGrad.addColorStop(0.58, palette.fabric);
    gloveGrad.addColorStop(1, palette.fabricShade);

    ctx.fillStyle = gloveGrad;
    ctx.strokeStyle = gloveGrad;

    traceRoundedPolygon(ctx, palmOutline);
    ctx.fill();

    for (const f of fingerChains) {
      traceSmoothFingerChain(ctx, f.pts);
      ctx.lineWidth = f.width;
      ctx.stroke();
    }

    // Lớp 3: Cổ tay bo tròn nổi khối (Ribbed Wrist Cuff)
    traceRoundedPolygon(ctx, cuffCorners);
    ctx.fillStyle = palette.fabric;
    ctx.fill();
    ctx.lineWidth = seamWidth;
    ctx.strokeStyle = palette.seam;
    ctx.stroke();

    // Đệm đầu ngón cảm ứng
    const activePair =
      state.heldGesture?.type === 'pinch'
        ? state.heldGesture.pair
        : state.pendingPair || state.readyPair || [4, 8];

    for (const f of fingerChains) {
      const tip = points[f.tip];
      const isPrimaryPinchFinger = activePair.includes(f.tip);
      const padRadius = f.width * (isPrimaryPinchFinger ? 0.36 : 0.24);

      ctx.beginPath();
      ctx.arc(tip.x, tip.y, padRadius, 0, Math.PI * 2);
      ctx.fillStyle = isPrimaryPinchFinger ? palette.accent : `${palette.seam}38`;
      ctx.fill();

      if (isPrimaryPinchFinger) {
        ctx.beginPath();
        ctx.arc(tip.x - padRadius * 0.25, tip.y - padRadius * 0.25, padRadius * 0.3, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.78)';
        ctx.fill();
      }
    }

    // Huy hiệu ngôi sao Signly giữa bàn tay
    const badgeRadius = clamp(palmSpan * 0.15, 12, 18.5);
    ctx.beginPath();
    ctx.arc(palmCenter.x, palmCenter.y, badgeRadius, 0, Math.PI * 2);
    ctx.fillStyle = `${palette.seam}14`;
    ctx.fill();
    ctx.lineWidth = 1.8;
    ctx.strokeStyle = `${palette.seam}40`;
    ctx.stroke();

    ctx.fillStyle = palette.accent;
    ctx.font = `800 ${Math.round(badgeRadius * 1.15)}px Plus Jakarta Sans, system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('✦', palmCenter.x, palmCenter.y + 0.5);

    // Lớp 4: Vòng ngắm nam châm + Vòng đếm ngược 2.2s nhấn nút
    this.drawPinchReticle(ctx, state, points, activePair, palette, isGrabbing, isHoveringTarget);

    ctx.restore();
  }

  private drawPinchReticle(
    ctx: CanvasRenderingContext2D,
    state: HandRuntimeState,
    points: Point[],
    activePair: readonly [number, number] | [number, number],
    palette: (typeof glovePalettes)[number],
    isGrabbing: boolean,
    isHoveringTarget: boolean,
  ): void {
    const tipA = points[activePair[0]];
    const tipB = points[activePair[1]];
    const aim = gesturePoint(points, state.heldGesture);
    if (!aim || !tipA || !tipB) return;

    const pinchMid = {
      x: (tipA.x + tipB.x) / 2,
      y: (tipA.y + tipB.y) / 2,
    };

    // Chế độ đặc biệt: Đang chụm giữ 2.2 giây để nhấn nút chức năng (Nghe từ / Xác nhận / Xóa làm lại)
    if (state.buttonHold) {
      const holdPct = clamp(state.buttonHold.progress, 0, 1);
      const holdRadius = 26;
      const remainSec = Math.max(0, ((1 - holdPct) * state.buttonHold.durationMs) / 1000).toFixed(1);

      ctx.save();
      ctx.shadowColor = palette.accent;
      ctx.shadowBlur = 14;

      // Đĩa nền trắng mờ giúp nhìn rõ vòng đếm ngược trên mọi nền nút
      ctx.beginPath();
      ctx.arc(aim.x, aim.y, holdRadius + 4, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.88)';
      ctx.fill();

      // Vòng rãnh nền
      ctx.beginPath();
      ctx.arc(aim.x, aim.y, holdRadius, 0, Math.PI * 2);
      ctx.strokeStyle = palette.ringTrack;
      ctx.lineWidth = 5;
      ctx.stroke();

      // Vòng cung đếm ngược chạy đầy 0% -> 100%
      ctx.beginPath();
      ctx.arc(aim.x, aim.y, holdRadius, -Math.PI / 2, -Math.PI / 2 + holdPct * Math.PI * 2);
      ctx.strokeStyle = palette.accent;
      ctx.lineWidth = 5.5;
      ctx.stroke();

      ctx.shadowBlur = 0;
      ctx.fillStyle = palette.seam;
      ctx.font = '800 12px Plus Jakarta Sans, system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`${remainSec}s`, aim.x, aim.y + 0.5);
      ctx.restore();
      return;
    }

    const progress = clamp(state.pinchProgress, 0, 1);

    if (!isGrabbing && progress > 0.22) {
      ctx.save();
      ctx.beginPath();
      ctx.setLineDash([4, 4]);
      ctx.moveTo(tipA.x, tipA.y);
      ctx.lineTo(tipB.x, tipB.y);
      ctx.strokeStyle = palette.accent;
      ctx.globalAlpha = 0.35 + progress * 0.5;
      ctx.lineWidth = 2.4;
      ctx.stroke();
      ctx.restore();
    }

    const targetPoint = isGrabbing ? aim : progress > 0.35 ? pinchMid : aim;
    const outerRadius = isGrabbing
      ? 15
      : isHoveringTarget
        ? 18 - progress * 4.5
        : 13 - progress * 3;

    ctx.save();
    if (isGrabbing || isHoveringTarget) {
      ctx.shadowColor = palette.accent;
      ctx.shadowBlur = isGrabbing ? 16 : 9;
    }

    ctx.beginPath();
    ctx.arc(targetPoint.x, targetPoint.y, outerRadius, 0, Math.PI * 2);
    ctx.strokeStyle = isGrabbing ? palette.accent : palette.ringTrack;
    ctx.lineWidth = isGrabbing ? 3.2 : 2.5;
    ctx.stroke();

    if (!isGrabbing && (progress > 0.12 || isHoveringTarget)) {
      const sweep = Math.max(0.22, progress) * Math.PI * 2;
      ctx.beginPath();
      ctx.arc(targetPoint.x, targetPoint.y, outerRadius, -Math.PI / 2, -Math.PI / 2 + sweep);
      ctx.strokeStyle = palette.accent;
      ctx.lineWidth = 3.2;
      ctx.stroke();
    }

    ctx.beginPath();
    ctx.arc(targetPoint.x, targetPoint.y, isGrabbing ? 6 : isHoveringTarget ? 5 : 4, 0, Math.PI * 2);
    ctx.fillStyle = isGrabbing || isHoveringTarget ? palette.accent : palette.seam;
    ctx.fill();
    ctx.lineWidth = 1.8;
    ctx.strokeStyle = '#ffffff';
    ctx.stroke();

    ctx.restore();
  }
}
