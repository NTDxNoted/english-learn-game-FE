import type { InputController, InputMode, InputControllerEvents } from './InputController';
import type { Point, GripTargetState } from '../utils/gestureRecognition';
import {
  toScreenPoint,
  gesturePoint,
  grabPoints,
  advanceGrip,
  assignHandSlots,
  nearestControl,
  slotAt,
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
}

const gloveFingers = [
  { chain: [17, 18, 19, 20], ring: 19, tip: 20, scale: 0.82 },
  { chain: [13, 14, 15, 16], ring: 15, tip: 16, scale: 0.92 },
  { chain: [9, 10, 11, 12], ring: 11, tip: 12, scale: 1.0 },
  { chain: [5, 6, 7, 8], ring: 7, tip: 8, scale: 0.95 },
  { chain: [1, 2, 3, 4], ring: 3, tip: 4, scale: 0.9 },
] as const;

const glovePalettes = [
  { fabric: '#eef2fa', light: '#ffffff', seam: '#322c82', pad: '#211c61', accent: '#ff7b62', glow: '#ffdb70' },
  { fabric: '#d8f1e7', light: '#ffffff', seam: '#19634b', pad: '#134e3a', accent: '#10b981', glow: '#a3e4cb' },
];

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));
const pointDistance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);

function traceRoundedPolygon(context: CanvasRenderingContext2D, points: Point[]): void {
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

export class GestureInputController implements InputController {
  readonly mode: InputMode = 'gesture';
  private events: InputControllerEvents = {};
  private active = false;

  private video: HTMLVideoElement | null = null;
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private stream: MediaStream | null = null;
  private worker: Worker | null = null;

  private cameraGeneration = 0;
  private framePending = false;
  private lastCaptureAt = 0;
  private lastVideoTime = -1;
  private handVisualDirty = false;
  private handMissUntil = 0;

  // Đo FPS
  private fpsFrames = 0;
  private lastFpsCheck = 0;

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
    };
  }

  async start(): Promise<void> {
    if (this.active) return;
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error('Trình duyệt không hỗ trợ truy cập camera');
    }

    this.events.onStatusChange?.('Đang yêu cầu quyền camera...');

    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
      });

      if (this.video) {
        this.video.srcObject = this.stream;
        await this.video.play();
      }

      this.events.onStatusChange?.('Đang tải mô hình nhận diện tay...');
      await this.initWorker();

      this.active = true;
      const gen = ++this.cameraGeneration;
      this.framePending = false;
      this.lastCaptureAt = 0;
      this.lastVideoTime = -1;
      this.lastFpsCheck = performance.now();
      this.fpsFrames = 0;
      this.handVisualDirty = false;
      this.handMissUntil = 0;

      this.resizeCanvas();
      window.addEventListener('resize', this.handleResize);

      this.events.onStatusChange?.('Đưa bàn tay vào khung hình để bắt đầu');
      requestAnimationFrame((now) => this.loop(now, gen));
    } catch (err: unknown) {
      this.stop();
      throw err;
    }
  }

  stop(): void {
    this.active = false;
    this.cameraGeneration++;
    window.removeEventListener('resize', this.handleResize);

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

    document.querySelectorAll<HTMLElement>('.game-slot').forEach((slot) => {
      slot.classList.remove('hand-target-0', 'hand-target-1');
    });
    document.querySelectorAll<HTMLElement>('.game-tile').forEach((tile) => {
      tile.classList.remove('hand-hover-0', 'hand-hover-1', 'drag-source');
    });

    this.events.onStatusChange?.('Đã tắt nhận diện tay');
  }

  private handleResize = () => {
    this.resizeCanvas();
    this.handVisualDirty = true;
  };

  private initWorker(): Promise<void> {
    return new Promise((resolve, reject) => {
      const worker = new Worker('/workers/hand-worker.js');
      this.worker = worker;
      const timeout = setTimeout(() => reject(new Error('Tải mô hình nhận diện tay quá hạn (timeout)')), 25000);

      worker.onmessage = ({ data }: MessageEvent) => {
        if (worker !== this.worker) return;
        if (data.type === 'ready') {
          clearTimeout(timeout);
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
          this.events.onError?.(data.message || 'Lỗi nhận diện');
        }
      };

      worker.onerror = (ev) => {
        clearTimeout(timeout);
        this.framePending = false;
        reject(new Error(ev.message || 'Lỗi Worker nhận diện'));
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

    // Phân loại cử chỉ dùng tọa độ thô đã khử nhiễu
    const screenW = window.innerWidth;
    const screenH = window.innerHeight;
    const measuredLandmarks = state.tracking?.raw?.map((raw) => toScreenPoint(raw, screenW, screenH));
    const points: Point[] = [
      ...grabPoints(state.targetLandmarks, state.heldGesture),
      ...(measuredLandmarks ? grabPoints(measuredLandmarks, state.heldGesture) : []),
    ];

    const padding = 42;
    let foundTile: HTMLElement | null = null;
    for (const anchor of points) {
      const tile = nearestControl('.game-tile:not(.used):not(.drag-source)', anchor.x, anchor.y, padding);
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

    // Xóa hiệu ứng hover trên các ô slot
    document.querySelectorAll<HTMLElement>('.game-slot').forEach((slot) => {
      slot.classList.remove('hand-target-0', 'hand-target-1');
    });

    const slot = slotAt(x, y);
    if (slot && !slot.classList.contains('filled')) {
      const slotIndex = parseInt(slot.dataset.index || '-1', 10);
      if (slotIndex >= 0) {
        this.events.onTileDrop?.({ tileId, letter, slotIndex });
      }
    }
    this.events.onTileRelease?.({ x, y, handId: state.id });
  }

  private resetHand(state: HandRuntimeState): void {
    this.finishHandDrag(state, -1, -1);
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
  }

  private handleDetectionResult(
    landmarkSets: Point[][],
    labels: (string | null)[],
    timestamp: number = performance.now(),
  ): void {
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
        if (state.visible && ++state.lostFrames > 8) {
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

      state.targetLandmarks = filtered.map((p) => toScreenPoint(p, screenW, screenH));
      state.visualLandmarks ||= state.targetLandmarks.map((p) => ({ ...p }));

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
          this.handMissUntil = performance.now() + 1800;
        }
      }
    }

    // Cập nhật thông báo hướng dẫn trực quan theo logic chuẩn của aws-workshop
    const isAnyDragging = this.handStates.some((s) => s.drag);
    const isAnyHolding = this.handStates.some((s) => s.heldGesture);
    const isMissed = performance.now() < this.handMissUntil;

    let status = 'Đưa bàn tay vào khung hình';
    if (isAnyDragging) {
      status = 'Đang giữ khối chữ cái';
    } else if (isAnyHolding) {
      status = 'Đã nhận cử chỉ gắp';
    } else if (isMissed) {
      status = 'Đã nhận gắp, nhưng tay chưa trên khối chữ';
    } else if (landmarkSets.length === 2) {
      status = 'Đã nhận diện 2 bàn tay';
    } else if (landmarkSets.length === 1) {
      const ready = this.handStates.some((s) => s.readyPair);
      status = ready
        ? 'Sẵn sàng: khép ngón cái–trỏ hoặc cái–giữa trên chữ'
        : 'Mở ngón cái–trỏ hoặc cái–giữa để chuẩn bị gắp';
    }

    this.events.onStatusChange?.(status);
    this.handVisualDirty = true;
  }

  private loop = (now: number, gen: number) => {
    if (!this.active || gen !== this.cameraGeneration) return;

    // Đo FPS
    this.fpsFrames++;
    if (now - this.lastFpsCheck >= 1000) {
      const currentFps = Math.round((this.fpsFrames * 1000) / (now - this.lastFpsCheck));
      this.events.onFpsUpdate?.(currentFps);
      this.fpsFrames = 0;
      this.lastFpsCheck = now;
    }

    // 1. Làm mượt visual landmarks ở tần số 60 FPS
    let visualMoved = false;
    for (const state of this.handStates) {
      if (!state.visible || !state.targetLandmarks) continue;
      const elapsed = state.lastVisualAt == null ? 16 : now - state.lastVisualAt;
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

    // 2. Cập nhật DOM trực tiếp không qua React render
    if (this.handVisualDirty || visualMoved) {
      for (const state of this.handStates) {
        if (!state.drag || !state.visualLandmarks) continue;
        const point = stableDragPoint(state, state.targetLandmarks || state.visualLandmarks);
        if (point) {
          state.ghost.style.left = `${point.x}px`;
          state.ghost.style.top = `${point.y}px`;
        }
      }

      // Xóa các lớp highlight cũ
      document.querySelectorAll<HTMLElement>('.game-slot').forEach((slot) => {
        slot.classList.remove('hand-target-0', 'hand-target-1');
      });
      document.querySelectorAll<HTMLElement>('.game-tile').forEach((tile) => {
        tile.classList.remove('hand-hover-0', 'hand-hover-1');
      });

      // Gắn lớp highlight mới
      for (const state of this.handStates) {
        if (!state.visible) continue;
        const point = state.drag
          ? state.dropPoint || this.handAim(state)
          : this.handAim(state);
        if (!point) continue;

        if (!state.drag) {
          const tile = nearestControl('.game-tile:not(.used):not(.drag-source)', point.x, point.y, 24);
          tile?.classList.add(`hand-hover-${state.id}`);
        } else {
          const slot = slotAt(point.x, point.y);
          if (slot && !slot.classList.contains('filled')) {
            slot.classList.add(`hand-target-${state.id}`);
          }
        }
      }

      this.drawVirtualHands();
      this.handVisualDirty = false;
    }

    // 3. Chụp khung hình mới từ video
    if (
      !this.framePending &&
      now - this.lastCaptureAt >= 24 &&
      this.video &&
      this.video.readyState >= 2 &&
      this.video.currentTime !== this.lastVideoTime
    ) {
      this.lastCaptureAt = now;
      this.lastVideoTime = this.video.currentTime;
      this.captureFrame(now, gen);
    }

    requestAnimationFrame((time) => this.loop(time, gen));
  };

  private async captureFrame(timestamp: number, gen: number) {
    if (!this.video) return;
    this.framePending = true;
    try {
      const bitmap = await createImageBitmap(this.video);
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

  private resizeCanvas() {
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

  private drawGloveCuff(points: Point[], palmSpan: number, palette: typeof glovePalettes[0]): void {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const wrist = points[0];
    const palmCenter = {
      x: (points[5].x + points[9].x + points[13].x + points[17].x) / 4,
      y: (points[5].y + points[9].y + points[13].y + points[17].y) / 4,
    };
    const length = Math.max(1, pointDistance(wrist, palmCenter));
    const axis = { x: (palmCenter.x - wrist.x) / length, y: (palmCenter.y - wrist.y) / length };
    const side = { x: -axis.y, y: axis.x };
    const nearHalf = palmSpan * 0.3;
    const farHalf = palmSpan * 0.39;
    const outer = { x: wrist.x - axis.x * palmSpan * 0.38, y: wrist.y - axis.y * palmSpan * 0.38 };
    const corners = [
      { x: wrist.x + side.x * nearHalf, y: wrist.y + side.y * nearHalf },
      { x: wrist.x - side.x * nearHalf, y: wrist.y - side.y * nearHalf },
      { x: outer.x - side.x * farHalf, y: outer.y - side.y * farHalf },
      { x: outer.x + side.x * farHalf, y: outer.y + side.y * farHalf },
    ];
    traceRoundedPolygon(ctx, corners);
    ctx.fillStyle = palette.fabric;
    ctx.fill();
    ctx.lineWidth = clamp(palmSpan * 0.045, 3, 7);
    ctx.strokeStyle = palette.seam;
    ctx.stroke();
  }

  private drawGloveFinger(
    points: Point[],
    finger: typeof gloveFingers[number],
    fingerWidth: number,
    palette: typeof glovePalettes[0],
  ): void {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const width = fingerWidth * finger.scale;
    const chain = finger.chain.map((idx) => points[idx]);
    ctx.beginPath();
    ctx.moveTo(chain[0].x, chain[0].y);
    for (let i = 1; i < chain.length; i++) ctx.lineTo(chain[i].x, chain[i].y);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = palette.seam;
    ctx.lineWidth = width + clamp(width * 0.25, 4, 8);
    ctx.stroke();

    ctx.strokeStyle = palette.fabric;
    ctx.lineWidth = width;
    ctx.stroke();

    const tip = points[finger.tip];
    ctx.beginPath();
    ctx.arc(tip.x, tip.y, width * 0.45, 0, Math.PI * 2);
    ctx.fillStyle = palette.pad;
    ctx.fill();
  }

  private drawGlovePalm(points: Point[], palmSpan: number, palette: typeof glovePalettes[0]): void {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const wrist = points[0];
    const across = {
      x: (points[17].x - points[5].x) / palmSpan,
      y: (points[17].y - points[5].y) / palmSpan,
    };
    const wristHalf = palmSpan * 0.25;
    const outline = [
      { x: wrist.x + across.x * wristHalf, y: wrist.y + across.y * wristHalf },
      points[5],
      points[9],
      points[13],
      points[17],
      { x: wrist.x - across.x * wristHalf, y: wrist.y - across.y * wristHalf },
    ];
    traceRoundedPolygon(ctx, outline);
    const gradient = ctx.createLinearGradient(points[9].x, points[9].y, wrist.x, wrist.y);
    gradient.addColorStop(0, palette.light);
    gradient.addColorStop(1, palette.fabric);
    ctx.fillStyle = gradient;
    ctx.fill();
    ctx.lineWidth = clamp(palmSpan * 0.05, 4, 8);
    ctx.strokeStyle = palette.seam;
    ctx.stroke();

    const center = {
      x: (wrist.x + points[9].x + points[13].x) / 3,
      y: (wrist.y + points[9].y + points[13].y) / 3,
    };
    ctx.beginPath();
    ctx.arc(center.x, center.y, clamp(palmSpan * 0.16, 11, 24), 0, Math.PI * 2);
    ctx.fillStyle = `${palette.pad}26`;
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = `${palette.seam}88`;
    ctx.stroke();
    ctx.fillStyle = palette.accent;
    ctx.font = `900 ${clamp(palmSpan * 0.18, 13, 27)}px Trebuchet MS, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('✦', center.x, center.y + 1);
  }

  private drawGloveHand(state: HandRuntimeState): void {
    if (!this.ctx || !state.visualLandmarks) return;
    const ctx = this.ctx;
    const points = state.visualLandmarks;
    const palette = glovePalettes[state.id];
    const palmSpan = clamp(pointDistance(points[5], points[17]), 70, 220);
    const fingerWidth = clamp(palmSpan * 0.19, 18, 43);

    ctx.save();
    ctx.globalAlpha = state.lostFrames ? 0.42 : 0.94;
    ctx.shadowColor = state.drag || state.heldGesture ? palette.glow : '#07123188';
    ctx.shadowBlur = state.drag || state.heldGesture ? 18 : 8;

    this.drawGloveCuff(points, palmSpan, palette);
    for (const finger of gloveFingers) {
      this.drawGloveFinger(points, finger, fingerWidth, palette);
    }
    this.drawGlovePalm(points, palmSpan, palette);

    const cursor = gesturePoint(points, state.heldGesture);
    if (cursor) {
      ctx.shadowBlur = 12;
      ctx.shadowColor = palette.glow;
      ctx.beginPath();
      ctx.arc(cursor.x, cursor.y, state.drag || state.heldGesture ? 10 : 6, 0, Math.PI * 2);
      ctx.fillStyle = state.drag || state.heldGesture ? palette.accent : `${palette.glow}cc`;
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = palette.light;
      ctx.stroke();
    }

    ctx.restore();
  }
}
