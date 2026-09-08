import type { Point } from '@/shared/geo';
import type { WindParams } from '@/shared/params';

export interface Round {
  seed: number;
  t0: number;
}

export const newRound = (): Round => ({ seed: (Math.random() * 2 ** 32) >>> 0, t0: performance.now() });

/** mulberry32. 같은 seed면 같은 난수열. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * 라운드 시드·경과 시간 → 바람 벡터 (px, "끝까지 쏘면 밀리는 양").
 * θ·m은 세 주기 사인으로만 변해서 같은 seed면 같은 곡선.
 */
export function windAt(seed: number, tMs: number, P: WindParams): Point {
  const rng = mulberry32(seed);
  const theta0 = rng() * Math.PI * 2;
  const s0 = rng();
  const phi1 = rng() * Math.PI * 2;
  const phi2 = rng() * Math.PI * 2;
  const phi3 = rng() * Math.PI * 2;
  rng(); // 위상 6개 — 여분 슬롯, 시드 소비 고정
  const t = tMs / 1000;
  const [T1, T2, T3] = P.periodsSec;
  const theta = theta0 + 0.6 * Math.sin((2 * Math.PI * t) / T1 + phi1) + 0.25 * Math.sin((2 * Math.PI * t) / T2 + phi2);
  const m = P.maxPx * (0.5 + 0.5 * Math.sin((2 * Math.PI * t) / T3 + phi3)) * (0.6 + 0.4 * s0);
  return [m * Math.cos(theta), m * Math.sin(theta)];
}
