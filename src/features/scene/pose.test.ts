import { describe, expect, it } from 'vitest';
import { apexHeight, flightPose, yawOf } from './pose';

const A = [195, 674] as const;
const L = [250, 300] as const;
const PIN = (62 * Math.PI) / 180;

describe('flightPose', () => {
  it('τ=0 앵커, τ=1 착지점, 높이 0', () => {
    const p0 = flightPose(0, A, L, 80, PIN);
    expect([p0.x, p0.z]).toEqual([A[0], A[1]]);
    expect(p0.y).toBe(0);
    const p1 = flightPose(1, A, L, 80, PIN);
    expect(p1.x).toBeCloseTo(L[0]);
    expect(p1.z).toBeCloseTo(L[1]);
    expect(p1.y).toBeCloseTo(0);
  });
  it('높이는 τ=0.5에서 최대 = apexH', () => {
    expect(flightPose(0.5, A, L, 80, PIN).y).toBeCloseTo(80);
    expect(flightPose(0.25, A, L, 80, PIN).y).toBeLessThan(80);
  });
  it('초반 피치는 위(+), 끝에서 정확히 −pinPitch', () => {
    expect(flightPose(0, A, L, 80, PIN).pitch).toBeGreaterThan(0);
    expect(flightPose(1, A, L, 80, PIN).pitch).toBeCloseTo(-PIN);
    expect(flightPose(0.95, A, L, 80, PIN).pitch).toBeGreaterThanOrEqual(-PIN);
  });
  it('yaw: 북(−dy) = +90°, 동(+dx) = 0', () => {
    expect(yawOf(0, -1)).toBeCloseTo(Math.PI / 2);
    expect(yawOf(1, 0)).toBeCloseTo(0);
  });
});

describe('apexHeight', () => {
  it('사거리 비례, 30..160 클램프', () => {
    expect(apexHeight(100, 0.22)).toBe(30);
    expect(apexHeight(500, 0.22)).toBeCloseTo(110);
    expect(apexHeight(2000, 0.22)).toBe(160);
  });
});
