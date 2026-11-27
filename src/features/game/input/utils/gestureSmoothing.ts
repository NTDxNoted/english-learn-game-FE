import type { Point, Gesture } from './gestureRecognition';
import { palmWidth, gesturePoint } from './gestureRecognition';

const distance = (a: Point, b: Point): number => Math.hypot(a.x - b.x, a.y - b.y);
const lowPass = (cutoff: number, dt: number): number => 1 - Math.exp(-2 * Math.PI * cutoff * dt);
const clonePoints = (points: Point[]): Point[] => points.map((p) => ({ x: p.x, y: p.y }));

export interface TrackingState {
  raw: Point[];
  visualRaw: Point[];
  filtered: Point[];
  velocity: Point[];
  pendingWrist: Point | null;
  time: number;
}

/**
 * Bộ lọc thích ứng One-Euro (1€ Filter) tối ưu độ trễ thấp:
 * - Khi đứng yên ngắm gắp chữ: cutoff thấp (~2.2Hz) khử rung vi mô tuyệt đối.
 * - Khi di chuyển tay nhanh: hệ số beta cao (28.0) mở băng thông tức thì, loại bỏ hiện tượng
 *   "kéo dây thun" (rubber-band lag) của bộ kẹp maxJointStep cũ.
 */
export function filterHandLandmarks(
  state: { tracking: TrackingState | null },
  landmarks: Point[],
  timestamp: number,
): Point[] | null {
  const previous = state.tracking;
  if (
    !previous ||
    !Number.isFinite(timestamp) ||
    timestamp <= previous.time ||
    timestamp - previous.time > 450
  ) {
    const points = clonePoints(landmarks);
    state.tracking = {
      raw: clonePoints(points),
      visualRaw: clonePoints(points),
      filtered: points,
      velocity: points.map(() => ({ x: 0, y: 0 })),
      pendingWrist: null,
      time: timestamp,
    };
    return points;
  }

  const scale = palmWidth(landmarks);
  const wristJump = distance(landmarks[0], previous.raw[0]);

  // Chỉ chặn nhiễu nhảy khung hình phi vật lý (> 1.7 lần bề ngang bàn tay trong 1 frame)
  if (wristJump > Math.max(0.32, scale * 1.7)) {
    if (
      !previous.pendingWrist ||
      distance(landmarks[0], previous.pendingWrist) > Math.max(0.12, scale * 0.6)
    ) {
      previous.pendingWrist = { x: landmarks[0].x, y: landmarks[0].y };
      return null;
    }
    const relocated = clonePoints(landmarks);
    state.tracking = {
      raw: clonePoints(relocated),
      visualRaw: clonePoints(relocated),
      filtered: relocated,
      velocity: relocated.map(() => ({ x: 0, y: 0 })),
      pendingWrist: null,
      time: timestamp,
    };
    return relocated;
  }
  previous.pendingWrist = null;

  const dt = Math.max(0.008, Math.min((timestamp - previous.time) / 1000, 0.1));
  const derivativeAlpha = lowPass(4.2, dt);
  const raw = clonePoints(landmarks);
  const filtered: Point[] = [];
  const velocity: Point[] = [];

  const minCutoff = 2.2;
  const beta = 28.0;

  for (let index = 0; index < raw.length; index++) {
    const point = raw[index];
    const prevRaw = previous.raw[index];
    const dx = (point.x - prevRaw.x) / dt;
    const dy = (point.y - prevRaw.y) / dt;
    const vx = previous.velocity[index].x + derivativeAlpha * (dx - previous.velocity[index].x);
    const vy = previous.velocity[index].y + derivativeAlpha * (dy - previous.velocity[index].y);
    const speed = Math.hypot(vx, vy);

    // Ngón cái (4) và ngón trỏ/giữa (8, 12) cần phản hồi chụm-mở nhanh hơn nữa
    const tipBoost = index === 4 || index === 8 || index === 12 ? 1.35 : 1.0;
    const cutoff = (minCutoff + beta * speed) * tipBoost;
    const alpha = Math.min(0.96, lowPass(cutoff, dt));

    filtered.push({
      x: previous.filtered[index].x + alpha * (point.x - previous.filtered[index].x),
      y: previous.filtered[index].y + alpha * (point.y - previous.filtered[index].y),
    });
    velocity.push({ x: vx, y: vy });
  }

  state.tracking = {
    raw,
    visualRaw: raw,
    filtered,
    velocity,
    pendingWrist: null,
    time: timestamp,
  };
  return filtered;
}

/**
 * Nội suy khung hình tần số cao (60Hz–144Hz) siêu nhạy giữa các lần nhận diện camera:
 * Chỉ khử rung dưới 2px, bám sát tức thì (tau = 5.5ms) khi tay di chuyển.
 */
export function smoothVisualLandmarks(
  current: Point[] | null,
  target: Point[] | null,
  elapsedMs: number,
  holding: boolean = false,
): Point[] | null {
  if (!target) return null;
  if (!current || current.length !== target.length) return clonePoints(target);
  const dt = Math.max(4, Math.min(Number.isFinite(elapsedMs) ? elapsedMs : 16, 40));

  return target.map((point, index) => {
    const previous = current[index];
    const gap = distance(previous, point);
    if (gap < 0.45) return previous;
    if (gap > 90) return { x: point.x, y: point.y };
    const tau = gap < 3.5 ? (holding ? 14 : 11) : holding ? 7 : 5.2;
    const alpha = 1 - Math.exp(-dt / tau);
    return {
      x: previous.x + alpha * (point.x - previous.x),
      y: previous.y + alpha * (point.y - previous.y),
    };
  });
}

export function stableDragPoint(
  state: { openFrames: number; dropPoint: Point | null; heldGesture: Gesture | null },
  points: Point[],
): Point | null {
  if (!state.openFrames) {
    const point = gesturePoint(points, state.heldGesture);
    if (point && (!state.dropPoint || distance(point, state.dropPoint) >= 1.2)) {
      state.dropPoint = point;
    }
  }
  return state.dropPoint || null;
}
