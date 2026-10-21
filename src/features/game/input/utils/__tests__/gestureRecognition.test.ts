import { describe, it, expect } from 'vitest';
import {
  palmWidth,
  pinchRatio,
  findPinchCandidate,
  findGrabCandidate,
  isFistClosed,
  isFistOpen,
  toScreenPoint,
  type Point,
} from '../gestureRecognition';

function createMockHand(wristX = 0.5, wristY = 0.5): Point[] {
  const points: Point[] = Array.from({ length: 21 }, () => ({ x: wristX, y: wristY }));
  points[5] = { x: wristX - 0.1, y: wristY };
  points[17] = { x: wristX + 0.1, y: wristY };
  const offsets: [number, number][] = [
    [4, -0.45],
    [8, -0.15],
    [12, 0],
    [16, 0.15],
    [20, 0.3],
  ];
  for (const [index, offset] of offsets) {
    points[index] = { x: wristX + offset, y: wristY - 0.25 };
  }
  return points;
}

describe('Gesture Recognition Math & Logic', () => {
  it('calculates palm width correctly and scales invariance', () => {
    const hand = createMockHand(0.5, 0.5);
    const width = palmWidth(hand);
    expect(width).toBeCloseTo(0.2, 2);
  });

  it('detects thumb-middle contact as a supported grab', () => {
    const points = createMockHand();
    points[4] = { x: 0.5, y: 0.25 };
    const pinch = findPinchCandidate(points);
    expect(pinch?.pair).toEqual([4, 12]);
    const grab = findGrabCandidate(points);
    expect(grab).toEqual({ type: 'pinch', pair: [4, 12] });
  });

  it('never accepts contact between two non-thumb fingers as a grab', () => {
    const points = createMockHand();
    points[20] = { x: 0.645, y: 0.25 };
    const ratio = pinchRatio(points, [16, 20]);
    expect(ratio).toBeLessThan(0.3);
    const grab = findGrabCandidate(points);
    expect(grab).toBeNull();
  });

  it('rejects a spread open hand', () => {
    const hand = createMockHand();
    expect(findPinchCandidate(hand)).toBeNull();
  });

  it('closed fist is recognized and not treated as a pinch grab', () => {
    const closed = createMockHand();
    const fingerBases = [
      [5, 6, 8],
      [9, 10, 12],
      [13, 14, 16],
      [17, 18, 20],
    ] as const;

    for (const [base, middle, tip] of fingerBases) {
      closed[middle] = { x: closed[base].x, y: closed[base].y - 0.06 };
      closed[tip] = { x: closed[base].x + 0.015, y: closed[base].y - 0.035 };
    }
    closed[4] = { x: 0.51, y: 0.47 };

    expect(isFistClosed(closed)).toBe(true);
    expect(findGrabCandidate(closed)).toBeNull();
  });

  it('open hand is recognized as fist open', () => {
    const open = createMockHand();
    const fingerBases = [
      [5, 6, 8],
      [9, 10, 12],
      [13, 14, 16],
      [17, 18, 20],
    ] as const;

    for (const [base, middle, tip] of fingerBases) {
      open[middle] = { x: open[base].x, y: open[base].y - 0.08 };
      open[tip] = { x: open[base].x, y: open[base].y - 0.26 };
    }

    expect(isFistOpen(open)).toBe(true);
  });

  it('correctly projects and mirrors coordinates to screen viewport', () => {
    const point: Point = { x: 0.2, y: 0.3 };
    const screen = toScreenPoint(point, 1000, 500);
    expect(screen.x).toBe(800); // (1 - 0.2) * 1000
    expect(screen.y).toBe(150); // 0.3 * 500
  });
});
