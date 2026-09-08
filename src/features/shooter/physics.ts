import { clamp, type Point } from '@/shared/geo';
import type { GameParams } from '@/shared/params';

export interface ShotGeometry {
  /** 발사 방향 단위벡터 (당긴 반대쪽) */
  dir: Point;
  /** 사거리 px */
  d: number;
  /** 바람 없는 조준점 */
  aim: Point;
  /** 바람 벡터 px */
  wind: Point;
  /** 실제 착지점 = aim + wind */
  landing: Point;
}

/**
 * 당김 크기 → 사거리 (설계서 §5.2)
 * u = (clamp(|p|, deadZone, pMax) − deadZone) / (pMax − deadZone)
 * d = dMin + (dMax − dMin) · u^γ
 * 데드존 경계가 정확히 dMin에 대응하도록 데드존을 뺀 구간을 정규화한다.
 */
export function pullToRange(mag: number, dMax: number, P: GameParams): number {
  const u = (clamp(mag, P.deadZone, P.pMax) - P.deadZone) / (P.pMax - P.deadZone);
  return P.dMinPx + (dMax - P.dMinPx) * Math.pow(u, P.gamma);
}

/** Box–Muller 표준정규. rng를 주입할 수 있어 테스트에서 결정론적으로 만들 수 있다. */
export function gaussian(rng: () => number = Math.random): number {
  let u = 0;
  let v = 0;
  while (u === 0) u = rng();
  while (v === 0) v = rng();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

/**
 * 당김 벡터 → 조준점·바람·착지점. pointerup 순간에 한 번 호출되어 착지점을 확정한다.
 * pull = start − current (손가락이 아래로 가면 pull.y > 0, 화살은 위로).
 */
export function computeShot(
  anchor: Point,
  pull: Point,
  dMax: number,
  P: GameParams,
  rng: () => number = Math.random,
): ShotGeometry {
  const mag = Math.hypot(pull[0], pull[1]);
  const dir: Point = mag > 0 ? [pull[0] / mag, pull[1] / mag] : [0, -1];
  const d = pullToRange(mag, dMax, P);
  const aim: Point = [anchor[0] + dir[0] * d, anchor[1] + dir[1] * d];
  const wind: Point = [gaussian(rng) * P.windSigma * d, gaussian(rng) * P.windSigma * d];
  const landing: Point = [aim[0] + wind[0], aim[1] + wind[1]];
  return { dir, d, aim, wind, landing };
}

/** 비행 시간 ms — 사거리에 비례 */
export function flightTime(d: number, dMax: number, P: GameParams): number {
  return P.tMin + (P.tMax - P.tMin) * clamp(d / dMax, 0, 1);
}

/** ease-out: 초반 빠르고 끝에 꽂힘 */
export const easeOut = (tau: number): number => 1 - Math.pow(1 - tau, 1.6);

/** 가짜 높이 0..1, 정점 τ=0.5 */
export const heightAt = (tau: number): number => 4 * tau * (1 - tau);

/** 당김 비율 0..1 (게이지·힌트 표시용) */
export function pullRatio(mag: number, P: GameParams): number {
  return clamp(mag, 0, P.pMax) / P.pMax;
}
