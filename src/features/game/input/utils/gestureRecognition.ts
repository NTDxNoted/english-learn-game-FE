export interface Point {
  x: number;
  y: number;
}

export type GrabPair = [number, number];

export type Gesture =
  | { type: 'pinch'; pair: GrabPair }
  | { type: 'fist' };

export const FINGERTIPS = [4, 8, 12, 16, 20] as const;
export const GRAB_PAIRS: readonly GrabPair[] = [[4, 8], [4, 12]];

export const samePair = (a: GrabPair | null | undefined, b: GrabPair | null | undefined): boolean =>
  Boolean(a && b && a[0] === b[0] && a[1] === b[1]);

export function palmWidth(landmarks: Point[]): number {
  return Math.max(0.04, Math.hypot(
    landmarks[5].x - landmarks[17].x,
    landmarks[5].y - landmarks[17].y,
  ));
}

export function pinchRatio(landmarks: Point[], pair: GrabPair): number {
  const [a, b] = pair;
  return Math.hypot(
    landmarks[a].x - landmarks[b].x,
    landmarks[a].y - landmarks[b].y,
  ) / palmWidth(landmarks);
}

export function pinchLimits(pair: GrabPair): { close: number; open: number } {
  return pair[0] === 4 && pair[1] === 8
    ? { close: 0.58, open: 0.95 }
    : pair.includes(4)
      ? { close: 0.66, open: 1.00 }
      : { close: 0.72, open: 1.05 };
}

export function findPinchCandidate(
  landmarks: Point[],
  eligiblePair: (pair: GrabPair) => boolean = () => true,
): { pair: GrabPair; score: number } | null {
  let best: { pair: GrabPair; score: number } | null = null;
  for (let a = 0; a < FINGERTIPS.length; a++) {
    for (let b = a + 1; b < FINGERTIPS.length; b++) {
      const pair: GrabPair = [FINGERTIPS[a], FINGERTIPS[b]];
      if (!eligiblePair(pair)) continue;
      const ratio = pinchRatio(landmarks, pair);
      const score = ratio / pinchLimits(pair).close;
      if (score < 1 && (!best || score < best.score)) {
        best = { pair, score };
      }
    }
  }
  return best;
}

const FINGERS = [
  [5, 6, 8],
  [9, 10, 12],
  [13, 14, 16],
  [17, 18, 20],
] as const;

function fingerCurlRatio(landmarks: Point[], [base, middle, tip]: readonly [number, number, number]): number {
  const segment = Math.max(0.02, Math.hypot(
    landmarks[middle].x - landmarks[base].x,
    landmarks[middle].y - landmarks[base].y,
  ));
  return Math.hypot(
    landmarks[tip].x - landmarks[base].x,
    landmarks[tip].y - landmarks[base].y,
  ) / segment;
}

function pairReach(landmarks: Point[], pair: GrabPair): number {
  const [a, b] = pair;
  const middleX = (landmarks[a].x + landmarks[b].x) / 2;
  const middleY = (landmarks[a].y + landmarks[b].y) / 2;
  return Math.hypot(middleX - landmarks[9].x, middleY - landmarks[9].y) / palmWidth(landmarks);
}

export function isFistClosed(landmarks: Point[]): boolean {
  const curledFingers = FINGERS.filter((finger) => fingerCurlRatio(landmarks, finger) < 1.45).length;
  const thumbAtPalm = Math.hypot(
    landmarks[4].x - landmarks[9].x,
    landmarks[4].y - landmarks[9].y,
  ) / palmWidth(landmarks) < 1.15;
  return curledFingers >= 3 && thumbAtPalm;
}

export function isFistOpen(landmarks: Point[]): boolean {
  return FINGERS.filter((finger) => fingerCurlRatio(landmarks, finger) > 1.9).length >= 3;
}

export function isFistReleased(landmarks: Point[]): boolean {
  const curls = FINGERS.map((finger) => fingerCurlRatio(landmarks, finger));
  return curls.filter((ratio) => ratio > 1.65).length >= 2 ||
    curls.filter((ratio) => ratio > 1.5).length >= 3;
}

export function findGrabCandidate(
  landmarks: Point[],
  eligiblePairs: readonly GrabPair[] = GRAB_PAIRS,
): Gesture | null {
  let best: { type: 'pinch'; pair: GrabPair; score: number } | null = null;
  for (const pair of eligiblePairs) {
    if (!GRAB_PAIRS.some((allowed) => samePair(allowed, pair))) continue;
    const ratio = pinchRatio(landmarks, pair);
    const score = ratio / pinchLimits(pair).close;
    if (score < 1 && pairReach(landmarks, pair) > 0.38 && (!best || score < best.score)) {
      best = { type: 'pinch', pair: [...pair], score };
    }
  }
  return best ? { type: best.type, pair: best.pair } : null;
}

export function grabReleased(landmarks: Point[], gesture: Gesture): boolean {
  return gesture.type === 'fist'
    ? isFistReleased(landmarks)
    : pinchRatio(landmarks, gesture.pair) > pinchLimits(gesture.pair).open;
}

export function toScreenPoint(point: Point, width: number, height: number): Point {
  return {
    x: Math.max(0, Math.min(width - 1, (1 - point.x) * width)),
    y: Math.max(0, Math.min(height - 1, point.y * height)),
  };
}

export function gesturePoint(points: Point[] | null, gesture: Gesture | null): Point | null {
  if (!points || !points.length) return null;
  if (gesture?.type === 'fist') return points[9];
  if (gesture?.type !== 'pinch') return points[8];
  const [a, b] = gesture.pair;
  return {
    x: (points[a].x + points[b].x) / 2,
    y: (points[a].y + points[b].y) / 2,
  };
}

export function grabPoints(points: Point[] | null, gesture: Gesture | null): Point[] {
  const aim = gesturePoint(points, gesture);
  if (!aim || !points) return [];
  return gesture?.type === 'pinch'
    ? [aim, ...gesture.pair.map((tip) => points[tip])]
    : [aim, points[8]];
}

export function nearestRectIndex(rects: (DOMRect | { left: number; top: number; right: number; bottom: number })[], x: number, y: number, padding: number): number {
  let bestIndex = -1;
  let bestDistance = Infinity;
  rects.forEach((box, index) => {
    const dx = Math.max(box.left - x, 0, x - box.right);
    const dy = Math.max(box.top - y, 0, y - box.bottom);
    const distance = Math.hypot(dx, dy);
    if (distance <= padding && distance < bestDistance) {
      bestIndex = index;
      bestDistance = distance;
    }
  });
  return bestIndex;
}

function tipReach(landmarks: Point[], tip: number): number {
  return Math.hypot(
    landmarks[tip].x - landmarks[9].x,
    landmarks[tip].y - landmarks[9].y,
  ) / palmWidth(landmarks);
}

export function findReadyPairs(landmarks: Point[]): GrabPair[] {
  return GRAB_PAIRS.filter(
    (pair) =>
      pinchRatio(landmarks, pair) > pinchLimits(pair).open &&
      tipReach(landmarks, 4) > 0.72 &&
      tipReach(landmarks, pair[1]) > 0.5,
  ).map((p) => [...p] as GrabPair);
}

export function findReadyPair(landmarks: Point[]): GrabPair | null {
  const pairs = findReadyPairs(landmarks);
  return pairs[0] || null;
}

export interface GripTargetState {
  heldGesture: Gesture | null;
  openFrames: number;
  closeFrames: number;
  readyPairs: GrabPair[];
  readyPair: GrabPair | null;
  pendingPair: GrabPair | null;
  readyType: string | null;
  directArmed: boolean;
}

export function advanceGrip(
  state: GripTargetState,
  landmarks: Point[],
  _hasDrag: boolean = false,
): { started?: Gesture; ended?: Gesture; opening?: boolean } {
  if (state.heldGesture) {
    const opening = grabReleased(landmarks, state.heldGesture);
    state.openFrames = opening ? state.openFrames + 1 : 0;
    if (state.openFrames >= 2) {
      const ended = state.heldGesture;
      state.heldGesture = null;
      state.readyPair = null;
      state.readyPairs = [];
      state.pendingPair = null;
      state.readyType = null;
      state.directArmed = false;
      state.closeFrames = 0;
      state.openFrames = 0;
      return { ended };
    }
    return { opening };
  }

  const opened = findReadyPairs(landmarks);
  state.readyPairs ||= [];
  for (const pair of opened) {
    if (!state.readyPairs.some((armed) => samePair(armed, pair))) {
      state.readyPairs.push([...pair]);
    }
  }
  if (!state.readyPairs.length) return {};
  state.readyType = 'pinch';
  const candidate = findGrabCandidate(landmarks, state.readyPairs);
  if (candidate && candidate.type === 'pinch') {
    if (!samePair(candidate.pair, state.pendingPair)) state.closeFrames = 0;
    state.pendingPair = candidate.pair;
    state.readyPair = candidate.pair;
    state.closeFrames++;
  } else if (opened.length) {
    state.readyPair = opened[0];
    state.pendingPair = null;
    state.closeFrames = 0;
  } else {
    state.closeFrames = Math.max(0, state.closeFrames - 0.5);
  }

  if (state.closeFrames < 2 || !state.pendingPair) return {};
  state.heldGesture = { type: 'pinch', pair: [...state.pendingPair] };
  state.directArmed = false;
  state.closeFrames = 0;
  return { started: state.heldGesture };
}

export function assignHandSlots(
  hands: Point[][],
  priorWrists: (Point | null)[],
  labels: (string | null)[] = [],
  priorLabels: (string | null)[] = [],
  locked: boolean[] = [],
): [number | null, number | null] {
  const currentLabels =
    labels.length === 2 && labels[0] && labels[0] === labels[1]
      ? [null, null]
      : labels;

  const cost = (slot: number, index: number | null): number => {
    if (index == null) return locked[slot] ? 0.75 : priorWrists[slot] ? 0.5 : 0.1;
    const label = currentLabels[index];
    const wrist = priorWrists[slot];
    if (!wrist) return 0.15;
    const distance = Math.hypot(hands[index][0].x - wrist.x, hands[index][0].y - wrist.y);
    if (label && priorLabels[slot] && label !== priorLabels[slot]) {
      if (hands.length !== 1 || distance > 0.08) return Infinity;
      return distance + 0.12;
    }
    if (locked[slot] && priorLabels[slot] && !label && distance > 0.1) return Infinity;
    if (locked[slot] && distance > 0.35) return Infinity;
    return distance;
  };

  const choices: (number | null)[] = [null, ...hands.map((_, index) => index)];
  let best: [number | null, number | null] = [null, null];
  let bestCost = Infinity;

  for (const first of choices) {
    for (const second of choices) {
      if (first != null && first === second) continue;
      const unused = hands.length - Number(first != null) - Number(second != null);
      const xBias = first != null && !priorWrists[0] && !priorWrists[1] ? hands[first][0].x * 0.001 : 0;
      const total = cost(0, first) + cost(1, second) + unused * 0.6 + xBias;
      if (total < bestCost) {
        best = [first, second];
        bestCost = total;
      }
    }
  }
  return best;
}
