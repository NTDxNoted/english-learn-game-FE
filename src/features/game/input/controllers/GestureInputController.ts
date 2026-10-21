import type { InputController, InputMode, InputControllerEvents } from './InputController';
import type { Point, GripTargetState } from '../utils/gestureRecognition';
import {
  toScreenPoint,
  gesturePoint,
  advanceGrip,
  assignHandSlots,
} from '../utils/gestureRecognition';
import {
  filterHandLandmarks,
  smoothVisualLandmarks,
  type TrackingState,
} from '../utils/gestureSmoothing';

export interface HandRuntimeState extends GripTargetState {
  id: number;
  visible: boolean;
  lastWrist: Point | null;
  handLabel: string | null;
  lostFrames: number;
  targetLandmarks: Point[] | null;
  visualLandmarks: Point[] | null;
  lastVisualAt: number | null;
  tracking: TrackingState | null;
  dropPoint: Point | null;
  isHolding: boolean;
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
    return {
      id,
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
      isHolding: false,
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

      this.resizeCanvas();
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
      state.visible = false;
      state.isHolding = false;
      state.targetLandmarks = null;
      state.visualLandmarks = null;
    });

    this.events.onStatusChange?.('Đã tắt nhận diện tay');
  }

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
      this.handStates.map((s) => s.isHolding),
    );

    const screenW = window.innerWidth;
    const screenH = window.innerHeight;

    for (let index = 0; index < this.handStates.length; index++) {
      const state = this.handStates[index];
      const assigned = assignments[index];

      if (assigned == null) {
        if (state.visible && ++state.lostFrames > 8) {
          if (state.isHolding) {
            state.isHolding = false;
            this.events.onTileRelease?.({ x: -1, y: -1, handId: state.id });
          }
          state.visible = false;
          state.lastWrist = null;
          state.targetLandmarks = null;
          state.visualLandmarks = null;
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

      const currentPoint = gesturePoint(state.targetLandmarks, state.heldGesture);
      if (currentPoint) {
        this.events.onCursorMove?.({ x: currentPoint.x, y: currentPoint.y, handId: state.id });
      }

      if (state.tracking?.raw) {
        const transition = advanceGrip(state, state.tracking.raw, state.isHolding);

        if (transition.ended) {
          state.isHolding = false;
          const drop = state.dropPoint || currentPoint || { x: -1, y: -1 };
          this.events.onTileRelease?.({ x: drop.x, y: drop.y, handId: state.id });
        } else if (transition.started && !state.isHolding) {
          state.isHolding = true;
          if (currentPoint) {
            this.events.onTileGrab?.({ x: currentPoint.x, y: currentPoint.y, handId: state.id });
          }
        }
      }
    }

    const isAnyHolding = this.handStates.some((s) => s.isHolding);
    const isAnyPinching = this.handStates.some((s) => s.heldGesture);
    const visibleCount = this.handStates.filter((s) => s.visible).length;

    if (isAnyHolding) {
      this.events.onStatusChange?.('Đang giữ khối chữ cái');
    } else if (isAnyPinching) {
      this.events.onStatusChange?.('Đã nhận cử chỉ gắp');
    } else if (visibleCount === 2) {
      this.events.onStatusChange?.('Đã nhận diện 2 bàn tay');
    } else if (visibleCount === 1) {
      this.events.onStatusChange?.('Khép ngón cái và trỏ để gắp chữ');
    } else {
      this.events.onStatusChange?.('Đưa bàn tay vào khung hình');
    }
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

    // Làm mượt visual landmarks
    for (const state of this.handStates) {
      if (!state.visible || !state.targetLandmarks) continue;
      const elapsed = state.lastVisualAt == null ? 16 : now - state.lastVisualAt;
      state.visualLandmarks = smoothVisualLandmarks(
        state.visualLandmarks,
        state.targetLandmarks,
        elapsed,
        state.isHolding,
      );
      state.lastVisualAt = now;
    }

    // Vẽ găng tay ảo Signly
    this.drawVirtualHands();

    // Chụp khung hình mới
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
      this.drawGlove(state);
    }
  }

  private drawGlove(state: HandRuntimeState): void {
    if (!this.ctx || !state.visualLandmarks) return;
    const ctx = this.ctx;
    const points = state.visualLandmarks;
    const palette = glovePalettes[state.id];
    const palmSpan = clamp(pointDistance(points[5], points[17]), 70, 220);
    const fingerWidth = clamp(palmSpan * 0.19, 18, 43);

    ctx.save();
    ctx.globalAlpha = state.lostFrames ? 0.4 : 0.92;
    ctx.shadowColor = state.heldGesture ? palette.glow : 'rgba(50, 44, 130, 0.2)';
    ctx.shadowBlur = state.heldGesture ? 16 : 8;

    // 1. Cổ tay (Cuff)
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

    ctx.beginPath();
    ctx.moveTo(wrist.x + side.x * nearHalf, wrist.y + side.y * nearHalf);
    ctx.lineTo(wrist.x - side.x * nearHalf, wrist.y - side.y * nearHalf);
    ctx.lineTo(outer.x - side.x * farHalf, outer.y - side.y * farHalf);
    ctx.lineTo(outer.x + side.x * farHalf, outer.y + side.y * farHalf);
    ctx.closePath();
    ctx.fillStyle = palette.fabric;
    ctx.fill();
    ctx.lineWidth = clamp(palmSpan * 0.045, 3, 7);
    ctx.strokeStyle = palette.seam;
    ctx.stroke();

    // 2. Ngón tay
    for (const finger of gloveFingers) {
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

    // 3. Lòng bàn tay
    ctx.beginPath();
    ctx.arc(palmCenter.x, palmCenter.y, clamp(palmSpan * 0.16, 12, 24), 0, Math.PI * 2);
    ctx.fillStyle = palette.accent;
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = palette.seam;
    ctx.stroke();

    // 4. Con trỏ điểm gắp
    const cursor = gesturePoint(points, state.heldGesture);
    if (cursor) {
      ctx.beginPath();
      ctx.arc(cursor.x, cursor.y, state.heldGesture ? 10 : 6, 0, Math.PI * 2);
      ctx.fillStyle = palette.accent;
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = palette.light;
      ctx.stroke();
    }

    ctx.restore();
  }
}

