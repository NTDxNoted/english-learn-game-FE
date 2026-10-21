import type { Point, Gesture } from './gestureRecognition';
import { palmWidth, gesturePoint } from './gestureRecognition';

const distance = (a: Point, b: Point): number => Math.hypot(a.x - b.x, a.y - b.y);
const lowPass = (cutoff: number, dt: number): number => 1 - Math.exp(-2 * Math.PI * cutoff * dt);
const clonePoints = (points: Point[]): Point[] => points.map((p) => ({ x: p.x, y: p.y }));

function medianPoint(history: Point[][], index: number): Point {
  const xs = history.map((points) => points[index].x).sort((a, b) => a - b);
  const ys = history.map((points) => points[index].y).sort((a, b) => a - b);
  const middle = Math.floor(history.length / 2);
  return { x: xs[middle], y: ys[middle] };
}

export interface TrackingState {
  raw: Point[];
  visualRaw: Point[];
  filtered: Point[];
  velocity: Point[];
  history: Point[][];
  pendingTips: boolean[];
  pendingWrist: Point | null;
  time: number;
}

export function filterHandLandmarks(
  state: { tracking: TrackingState | null },
  landmarks: Point[],
  timestamp: number,
): Point[] | null {
  const previous = state.tracking;
  if (!previous || !Number.isFinite(timestamp) || timestamp <= previous.time || timestamp - previous.time > 500) {
    const points = landmarks.map((p) => ({ x: p.x, y: p.y }));
    state.tracking = {
      raw: clonePoints(points),
      visualRaw: clonePoints(points),
      filtered: points,
      velocity: points.map(() => ({ x: 0, y: 0 })),
      history: [clonePoints(points), clonePoints(points), clonePoints(points)],
      pendingTips: Array(21).fill(false),
      pendingWrist: null,
      time: timestamp,
    };
    return points;
  }

  const scale = palmWidth(landmarks);
  const wristJump = distance(landmarks[0], previous.raw[0]);
  let confirmedRelocation = false;

  if (wristJump > Math.max(0.17, scale * 0.85)) {
    if (!previous.pendingWrist || distance(landmarks[0], previous.pendingWrist) > Math.max(0.08, scale * 0.45)) {
      previous.pendingWrist = { x: landmarks[0].x, y: landmarks[0].y };
      return null;
    }
    confirmedRelocation = true;
  }
  previous.pendingWrist = null;

  const dt = Math.max(0.016, Math.min((timestamp - previous.time) / 1000, 0.12));
  const derivativeAlpha = lowPass(1, dt);
  const raw: Point[] = [];
  const filtered: Point[] = [];
  const velocity: Point[] = [];

  for (let index = 0; index < landmarks.length; index++) {
    let point = landmarks[index];
    if (
      [4, 8, 12, 16, 20].includes(index) &&
      wristJump < scale * 0.35 &&
      distance(point, previous.raw[index]) > Math.max(0.11, scale * 0.65) &&
      !previous.pendingTips[index]
    ) {
      previous.pendingTips[index] = true;
      point = previous.raw[index];
    } else {
      previous.pendingTips[index] = false;
    }
    raw.push({ x: point.x, y: point.y });
  }

  const history = confirmedRelocation
    ? [clonePoints(raw), clonePoints(raw), clonePoints(raw)]
    : [clonePoints(raw), ...(previous.history || [clonePoints(previous.raw), clonePoints(previous.raw)])].slice(0, 3);

  const wristMotion = {
    x: raw[0].x - previous.raw[0].x,
    y: raw[0].y - previous.raw[0].y,
  };
  const residualLimit = Math.max(0.035, scale * 0.22);

  const visualRaw = raw.map((point, index) => {
    if (index === 0 || confirmedRelocation) return { ...point };
    const residual = Math.hypot(
      point.x - previous.raw[index].x - wristMotion.x,
      point.y - previous.raw[index].y - wristMotion.y,
    );
    return residual > residualLimit ? medianPoint(history, index) : { ...point };
  });

  const previousVisualRaw = previous.visualRaw || previous.raw;
  if (!confirmedRelocation && wristJump < scale * 0.35) {
    const maxJointStep = Math.max(0.028, scale * 0.18);
    for (let index = 1; index < visualRaw.length; index++) {
      const expected = {
        x: previousVisualRaw[index].x + wristMotion.x,
        y: previousVisualRaw[index].y + wristMotion.y,
      };
      const jump = distance(visualRaw[index], expected);
      if (jump <= maxJointStep) continue;
      const amount = maxJointStep / jump;
      visualRaw[index] = {
        x: expected.x + (visualRaw[index].x - expected.x) * amount,
        y: expected.y + (visualRaw[index].y - expected.y) * amount,
      };
    }
  }

  for (let index = 0; index < visualRaw.length; index++) {
    const point = visualRaw[index];
    const dx = (point.x - previousVisualRaw[index].x) / dt;
    const dy = (point.y - previousVisualRaw[index].y) / dt;
    const vx = previous.velocity[index].x + derivativeAlpha * (dx - previous.velocity[index].x);
    const vy = previous.velocity[index].y + derivativeAlpha * (dy - previous.velocity[index].y);
    const alpha = Math.min(0.9, lowPass(3.5 + 8 * Math.hypot(vx, vy), dt));
    filtered.push({
      x: previous.filtered[index].x + alpha * (point.x - previous.filtered[index].x),
      y: previous.filtered[index].y + alpha * (point.y - previous.filtered[index].y),
    });
    velocity.push({ x: vx, y: vy });
  }

  state.tracking = {
    raw,
    visualRaw,
    filtered,
    velocity,
    history,
    pendingTips: previous.pendingTips,
    pendingWrist: null,
    time: timestamp,
  };
  return filtered;
}

export function smoothVisualLandmarks(
  current: Point[] | null,
  target: Point[] | null,
  elapsedMs: number,
  holding: boolean = false,
): Point[] | null {
  if (!target) return null;
  if (!current || current.length !== target.length) return clonePoints(target);
  const dt = Math.max(8, Math.min(Number.isFinite(elapsedMs) ? elapsedMs : 16, 50));

  return target.map((point, index) => {
    const previous = current[index];
    const gap = distance(previous, point);
    if (gap < 0.75) return previous;
    const tau = holding ? (gap < 12 ? 35 : 9) : (gap < 9 ? 25 : 8);
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
    if (point && (!state.dropPoint || distance(point, state.dropPoint) >= 2.5)) {
      state.dropPoint = point;
    }
  }
  return state.dropPoint || null;
}
