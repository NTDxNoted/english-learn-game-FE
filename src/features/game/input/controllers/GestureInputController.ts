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
    ringTrack: 'rgba(50, 44, 130, 0.22)',
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
    ringTrack: 'rgba(25, 99, 75, 0.22)',
  },
] as const;

const CAPTURE_MIN_INTERVAL_MS = 14; // Cho phép tới ~60–70 FPS camera thực tế
const BITMAP_TARGET_WIDTH = 320;
const BITMAP_TARGET_HEIGHT = 240;
const CONTROL_CACHE_TTL_MS = 90;

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));
const pointDistance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);

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

/**
 * Xây dựng đa giác lòng bàn tay giải phẫu liền mạch:
 * - Sửa triệt để lỗi ngược dấu vector `across` gây xoắn hình số 8 ở cổ tay.
 * - Nối liền bầu ngón cái (CMC 1 -> MCP 2) vào lòng bàn tay để ngón cái không bị đứt rời.
 */
export function buildAnatomicalPalmOutline(points: Point[], palmSpan: number): {
  palmOutline: Point[];
  cuffCorners: Point[];
  palmCenter: Point;
} {
  const wrist = points[0];
  const rawAcrossLen = Math.max(1, pointDistance(points[5], points[17]));
  // Vector đơn vị hướng từ phía ngón Trỏ (5) sang phía ngón Út (17)
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

  // Mép cổ tay phía ngón Cái/Trỏ (-across) và phía ngón Út (+across) — cùng phía, không bao giờ tự cắt!
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

  // Đo FPS nhận diện AI thực tế (không đếm nhầm tần số quét màn hình 144Hz)
  private inferenceFrames = 0;
  private lastFpsCheck = 0;

  // Bộ nhớ đệm tọa độ DOM để tránh layout reflow 144 lần/giây
  private cachedTiles: CachedControl[] = [];
  private cachedSlots: CachedControl[] = [];
  private controlCacheAt = 0;
  private hoveredTiles: [HTMLElement | null, HTMLElement | null] = [null, null];
  private targetedSlots: [HTMLElement | null, HTMLElement | null] = [null, null];

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
  }

  private refreshControlCacheIfNeeded(now: number): void {
    if (typeof document === 'undefined') return;
    if (
      this.controlCacheAt > 0 &&
      now - this.controlCacheAt < CONTROL_CACHE_TTL_MS &&
      this.cachedTiles.every((item) => item.element.isConnected) &&
      this.cachedSlots.every((item) => item.element.isConnected)
    ) {
      return;
    }
    this.controlCacheAt = now;
    this.cachedTiles = Array.from(
      document.querySelectorAll<HTMLElement>('.game-tile:not(.used):not(.drag-source)'),
    ).map((element) => ({ element, rect: element.getBoundingClientRect() }));

    this.cachedSlots = Array.from(
      document.querySelectorAll<HTMLElement>('.game-slot:not(.filled)'),
    ).map((element) => ({ element, rect: element.getBoundingClientRect() }));
  }

  private findNearestCachedTile(x: number, y: number, padding: number, now: number): HTMLElement | null {
    this.refreshControlCacheIfNeeded(now);
    const available = this.cachedTiles.filter(
      (item) =>
        item.element.isConnected &&
        !item.element.classList.contains('used') &&
        !item.element.classList.contains('drag-source'),
    );
    if (!available.length) return null;
    const idx = nearestRectIndex(
      available.map((item) => item.rect),
      x,
      y,
      padding,
    );
    return idx < 0 ? null : available[idx].element;
  }

  private findNearestCachedSlot(x: number, y: number, padding: number, now: number): HTMLElement | null {
    this.refreshControlCacheIfNeeded(now);
    const available = this.cachedSlots.filter(
      (item) => item.element.isConnected && !item.element.classList.contains('filled'),
    );
    if (!available.length) return null;
    const idx = nearestRectIndex(
      available.map((item) => item.rect),
      x,
      y,
      padding,
    );
    return idx < 0 ? null : available[idx].element;
  }

  private updateHandHighlight(
    handId: number,
    nextTile: HTMLElement | null,
    nextSlot: HTMLElement | null,
  ): void {
    const prevTile = this.hoveredTiles[handId];
    if (prevTile !== nextTile) {
      prevTile?.classList.remove(`hand-hover-${handId}`);
      nextTile?.classList.add(`hand-hover-${handId}`);
      this.hoveredTiles[handId] = nextTile;
    }

    const prevSlot = this.targetedSlots[handId];
    if (prevSlot !== nextSlot) {
      prevSlot?.classList.remove(`hand-target-${handId}`);
      nextSlot?.classList.add(`hand-target-${handId}`);
      this.targetedSlots[handId] = nextSlot;
    }
  }

  private clearAllHighlights(): void {
    for (let id = 0; id < 2; id++) {
      this.updateHandHighlight(id, null, null);
    }
    if (typeof document !== 'undefined') {
      document.querySelectorAll<HTMLElement>('.game-slot').forEach((slot) => {
        slot.classList.remove('hand-target-0', 'hand-target-1');
      });
      document.querySelectorAll<HTMLElement>('.game-tile').forEach((tile) => {
        tile.classList.remove('hand-hover-0', 'hand-hover-1', 'drag-source');
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

  private beginHandDrag(state: HandRuntimeState): boolean {
    const point = gesturePoint(state.targetLandmarks, state.heldGesture);
    if (!point) return false;

    const now = performance.now();
    this.invalidateControlCache();

    const screenW = window.innerWidth;
    const screenH = window.innerHeight;
    const measuredLandmarks = state.tracking?.raw
      ? projectNormalizedHandToScreen(state.tracking.raw, screenW, screenH)
      : null;

    const points: Point[] = [
      ...grabPoints(state.targetLandmarks, state.heldGesture),
      ...(measuredLandmarks ? grabPoints(measuredLandmarks, state.heldGesture) : []),
    ];

    const padding = 42;
    let foundTile: HTMLElement | null = null;
    for (const anchor of points) {
      const tile = this.findNearestCachedTile(anchor.x, anchor.y, padding, now);
      if (tile) {
        foundTile = tile;
        break;
      }
    }

    if (!foundTile || foundTile.classList.contains('used') || foundTile.classList.contains('drag-source')) {
      return false;
    }

    const tileId = foundTile.dataset.id || '';
    const letter = foundTile.dataset.letter || foundTile.textContent?.trim() || '';

    state.drag = { tile: foundTile, tileId, letter };
    state.dropPoint = point;
    foundTile.classList.add('drag-source');
    this.invalidateControlCache();

    state.ghost.textContent = letter;
    state.ghost.hidden = false;
    state.ghost.style.left = `${point.x}px`;
    state.ghost.style.top = `${point.y}px`;

    this.events.onTileGrab?.({ x: point.x, y: point.y, handId: state.id });
    return true;
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

  private finishHandDrag(state: HandRuntimeState, x: number, y: number): void {
    if (!state.drag) return;
    const { tile, tileId, letter } = state.drag;
    state.drag = null;
    state.dropPoint = null;
    tile.classList.remove('drag-source');
    state.ghost.hidden = true;

    this.updateHandHighlight(state.id, null, null);
    this.invalidateControlCache();

    if (x >= 0 && y >= 0) {
      const slot = this.findNearestCachedSlot(x, y, 40, performance.now());
      if (slot && !slot.classList.contains('filled')) {
        const slotIndex = parseInt(slot.dataset.index || '-1', 10);
        if (slotIndex >= 0) {
          this.events.onTileDrop?.({ tileId, letter, slotIndex });
          this.invalidateControlCache();
        }
      }
    }
    this.events.onTileRelease?.({ x, y, handId: state.id });
  }

  private resetHand(state: HandRuntimeState): void {
    this.finishHandDrag(state, -1, -1);
    this.updateHandHighlight(state.id, null, null);
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

  private handleDetectionResult(
    landmarkSets: Point[][],
    labels: (string | null)[],
    timestamp: number = performance.now(),
  ): void {
    this.inferenceFrames++;

    const assignments = assignHandSlots(
      landmarkSets,
      this.handStates.map((s) => s.lastWrist),
      labels,
      this.handStates.map((s) => s.handLabel),
      this.handStates.map((s) => Boolean(s.drag)),
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
      const filtered = filterHandLandmarks(state, rawLandmarks, timestamp);
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
        const transition = advanceGrip(state, state.tracking.raw, Boolean(state.drag));

        if (transition.ended) {
          const point = state.dropPoint || releasePoint;
          this.finishHandDrag(state, point?.x ?? -1, point?.y ?? -1);
        } else if (transition.started && !this.beginHandDrag(state)) {
          this.rejectUnattachedGrip(state);
          this.handMissUntil = performance.now() + 1600;
        }
      }
    }

    const isAnyDragging = this.handStates.some((s) => s.drag);
    const isAnyHolding = this.handStates.some((s) => s.heldGesture);
    const isMissed = performance.now() < this.handMissUntil;

    let status = 'Đưa bàn tay vào khung hình';
    if (isAnyDragging) {
      status = 'Đang giữ khối chữ — thả ngón trên ô trống';
    } else if (isAnyHolding) {
      status = 'Đã nhận cử chỉ gắp';
    } else if (isMissed) {
      status = 'Hãy đặt vòng ngắm lên chữ cái rồi chụm ngón';
    } else if (landmarkSets.length === 2) {
      status = 'Đã nhận diện 2 bàn tay';
    } else if (landmarkSets.length === 1) {
      const ready = this.handStates.some((s) => s.readyPair);
      status = ready
        ? 'Sẵn sàng: chụm ngón cái–trỏ để gắp chữ'
        : 'Mở nhẹ ngón cái–trỏ để chuẩn bị gắp';
    }

    this.events.onStatusChange?.(status);
    this.handVisualDirty = true;
  }

  private loop = (now: number, gen: number) => {
    if (!this.active || gen !== this.cameraGeneration) return;

    // Báo cáo FPS nhận diện AI/Camera thực tế mỗi giây
    if (now - this.lastFpsCheck >= 1000) {
      const currentFps = Math.round((this.inferenceFrames * 1000) / (now - this.lastFpsCheck));
      if (currentFps > 0 || this.video?.readyState === 4) {
        this.events.onFpsUpdate?.(currentFps);
      }
      this.inferenceFrames = 0;
      this.lastFpsCheck = now;
    }

    // 1. Nội suy mượt tốc độ cao giữa các frame camera
    let visualMoved = false;
    for (const state of this.handStates) {
      if (!state.visible || !state.targetLandmarks) continue;
      const elapsed = state.lastVisualAt == null ? 12 : now - state.lastVisualAt;
      const next = smoothVisualLandmarks(
        state.visualLandmarks,
        state.targetLandmarks,
        elapsed,
        Boolean(state.drag),
      );
      if (next) {
        visualMoved ||= next.some(
          (p, i) => !state.visualLandmarks || p.x !== state.visualLandmarks[i].x || p.y !== state.visualLandmarks[i].y,
        );
        state.visualLandmarks = next;
      }
      state.lastVisualAt = now;
    }

    // 2. Cập nhật vị trí khối chữ kéo và highlight ô mục tiêu (dùng cache, không ép reflow DOM)
    if (this.handVisualDirty || visualMoved) {
      for (const state of this.handStates) {
        if (!state.visible) {
          this.updateHandHighlight(state.id, null, null);
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
          this.updateHandHighlight(state.id, null, null);
          continue;
        }

        if (!state.drag) {
          const tile = this.findNearestCachedTile(aimPoint.x, aimPoint.y, 28, now);
          this.updateHandHighlight(state.id, tile, null);
        } else {
          const slot = this.findNearestCachedSlot(aimPoint.x, aimPoint.y, 40, now);
          this.updateHandHighlight(state.id, null, slot);
        }
      }

      this.drawVirtualHands();
      this.handVisualDirty = false;
    }

    // 3. Gửi frame mới sang GPU Worker ngay khi webcam có hình mới
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

  private drawVirtualHands(): void {
    if (!this.ctx || !this.canvas) return;
    this.ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

    for (const state of this.handStates) {
      if (!state.visible || !state.visualLandmarks) continue;
      this.drawGloveHand(state);
    }
  }

  /**
   * Vẽ găng tay 3D Signly nhỏ gọn, liền khối giải phẫu + Vòng ngắm nam châm (Pinch Reticle):
   * - Vẽ 2 lớp (Seam Outline trước -> Pastel Gradient Fill đè lên) giúp 5 ngón tay và bầu ngón cái
   *   hòa quyện thành một chiếc găng tay 3D tròn trịa, không còn vạch chia cắt rời rạc.
   * - Đổ bóng cứng 3D (+4px Y) đồng bộ phong cách Tactile 3D của các viên chữ cái Signly.
   */
  private drawGloveHand(state: HandRuntimeState): void {
    if (!this.ctx || !state.visualLandmarks) return;
    const ctx = this.ctx;
    const points = state.visualLandmarks;
    const palette = glovePalettes[state.id] || glovePalettes[0];
    const isGrabbing = Boolean(state.drag || state.heldGesture);
    const isHoveringTarget = Boolean(this.hoveredTiles[state.id] || this.targetedSlots[state.id]);

    const palmSpan = clamp(pointDistance(points[5], points[17]), 48, 86);
    const fingerWidth = clamp(palmSpan * 0.225, 12.5, 19.5);
    const seamWidth = 2.5;

    const { palmOutline, cuffCorners, palmCenter } = buildAnatomicalPalmOutline(points, palmSpan);
    const fingerChains = gloveFingers.map((finger) => ({
      ...finger,
      width: fingerWidth * finger.scale,
      pts: finger.chain.map((idx) => points[idx]),
    }));

    ctx.save();
    ctx.globalAlpha = state.lostFrames ? 0.4 : isGrabbing ? 0.95 : 0.86;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Lớp 0: Bóng cứng 3D Tactile (+4px trục Y chuẩn Signly)
    ctx.save();
    ctx.translate(0, 4);
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
      ctx.shadowBlur = 16;
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

    // Lớp 2: Vải găng tay Pastel 3D liền mạch (xóa sạch đường cắt nội bộ giữa ngón & bàn tay)
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

    // Đệm đầu ngón cảm ứng (nổi bật ở ngón Cái & Trỏ để hướng dẫn chụm gắp trực quan)
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

      // Điểm phản quang trắng 3D nhỏ trên đầu ngón chính
      if (isPrimaryPinchFinger) {
        ctx.beginPath();
        ctx.arc(tip.x - padRadius * 0.25, tip.y - padRadius * 0.25, padRadius * 0.3, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
        ctx.fill();
      }
    }

    // Huy hiệu ngôi sao Signly giữa mu bàn tay
    const badgeRadius = clamp(palmSpan * 0.145, 8.5, 12.5);
    ctx.beginPath();
    ctx.arc(palmCenter.x, palmCenter.y, badgeRadius, 0, Math.PI * 2);
    ctx.fillStyle = `${palette.seam}14`;
    ctx.fill();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = `${palette.seam}40`;
    ctx.stroke();

    ctx.fillStyle = palette.accent;
    ctx.font = `800 ${Math.round(badgeRadius * 1.15)}px Plus Jakarta Sans, system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('✦', palmCenter.x, palmCenter.y + 0.5);

    // Lớp 4: Vòng ngắm nam châm (Magnetic Pinch Reticle)
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
    const progress = clamp(state.pinchProgress, 0, 1);

    // Tia nối từ tính giữa 2 đầu ngón khi bắt đầu khép ngón (> 22%)
    if (!isGrabbing && progress > 0.22) {
      ctx.save();
      ctx.beginPath();
      ctx.setLineDash([3, 3]);
      ctx.moveTo(tipA.x, tipA.y);
      ctx.lineTo(tipB.x, tipB.y);
      ctx.strokeStyle = palette.accent;
      ctx.globalAlpha = 0.35 + progress * 0.5;
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.restore();
    }

    // Vòng con trỏ ngắm chính xác trên điểm gắp/thả
    const targetPoint = isGrabbing ? aim : progress > 0.35 ? pinchMid : aim;
    const outerRadius = isGrabbing
      ? 13
      : isHoveringTarget
        ? 15 - progress * 4
        : 11 - progress * 2.5;

    ctx.save();
    if (isGrabbing || isHoveringTarget) {
      ctx.shadowColor = palette.accent;
      ctx.shadowBlur = isGrabbing ? 14 : 8;
    }

    // Vòng nền mờ
    ctx.beginPath();
    ctx.arc(targetPoint.x, targetPoint.y, outerRadius, 0, Math.PI * 2);
    ctx.strokeStyle = isGrabbing ? palette.accent : palette.ringTrack;
    ctx.lineWidth = isGrabbing ? 3 : 2.2;
    ctx.stroke();

    // Cung tiến độ chụm ngón (khép ngón tới đâu vòng cam chạy đầy tới đó)
    if (!isGrabbing && (progress > 0.12 || isHoveringTarget)) {
      const sweep = Math.max(0.22, progress) * Math.PI * 2;
      ctx.beginPath();
      ctx.arc(targetPoint.x, targetPoint.y, outerRadius, -Math.PI / 2, -Math.PI / 2 + sweep);
      ctx.strokeStyle = palette.accent;
      ctx.lineWidth = 2.8;
      ctx.stroke();
    }

    // Tâm chấm tròn chuẩn xác
    ctx.beginPath();
    ctx.arc(targetPoint.x, targetPoint.y, isGrabbing ? 5.5 : isHoveringTarget ? 4.5 : 3.5, 0, Math.PI * 2);
    ctx.fillStyle = isGrabbing || isHoveringTarget ? palette.accent : palette.seam;
    ctx.fill();
    ctx.lineWidth = 1.6;
    ctx.strokeStyle = '#ffffff';
    ctx.stroke();

    ctx.restore();
  }
}
