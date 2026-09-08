import { clamp, type Point } from '@/shared/geo';
import type { EventParams, GameParams } from '@/shared/params';

export type EventKind = 'plane' | 'finger' | 'gull' | 'gust';
export const EVENT_KINDS: readonly EventKind[] = ['plane', 'finger', 'gull', 'gust'];

export const EVENT_LABEL: Record<EventKind, string> = {
  plane: '종이비행기 충돌',
  finger: '손가락 튕김',
  gull: '갈매기',
  gust: '돌풍',
};

export interface FlightEvent {
  kind: EventKind;
  at: number;
  side: 1 | -1;
  kick: Point;
}

export interface ShotGeometry {
  /** 발사 방향 단위벡터 (당긴 반대쪽) */
  dir: Point;
  /** 사거리 px */
  d: number;
  /** 바람 없는 조준점 */
  aim: Point;
  /** 총 바람 벡터 px (drift + residual) */
  wind: Point;
  /** HUD에 보인 바람 · (d / dMax) */
  drift: Point;
  /** 비행 중 사건. 없으면 null */
  event: FlightEvent | null;
  /** 실제 착지점 = aim + drift + residual + kick */
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

export function parseEventParam(search: string): EventKind | undefined {
  const v = new URLSearchParams(search.startsWith('?') ? search : `?${search}`).get('event');
  return EVENT_KINDS.find((k) => k === v);
}

/** 바람 세기 → 사건 확률. 무풍이면 rate, |w|=maxPx이면 rateWindy. */
export function eventRateForWind(wind: Point, P: GameParams): number {
  const t = P.wind.maxPx > 0 ? clamp(Math.hypot(wind[0], wind[1]) / P.wind.maxPx, 0, 1) : 0;
  return P.events.rate + (P.events.rateWindy - P.events.rate) * t;
}

/** 발사 순간 사건 샘플. force가 있으면 rate를 건너뛴다. */
export function sampleEvent(
  rng: () => number,
  P: EventParams,
  dir: Point,
  d: number,
  force?: EventKind,
  rate = P.rate,
): FlightEvent | null {
  if (!force && rng() >= rate) return null;
  const kind = force ?? EVENT_KINDS[Math.min(3, Math.floor(rng() * 4))]!;
  const at = P.atRange[0] + rng() * (P.atRange[1] - P.atRange[0]);
  const side: 1 | -1 = rng() < 0.5 ? -1 : 1;
  let kx: number;
  let ky: number;
  if (kind === 'plane' || kind === 'finger') {
    kx = -dir[1] * side;
    ky = dir[0] * side;
  } else if (kind === 'gull') {
    kx = dir[0] * side;
    ky = dir[1] * side;
  } else {
    const ang = rng() * Math.PI * 2;
    kx = Math.cos(ang);
    ky = Math.sin(ang);
  }
  const mag = Math.min(P.kick[kind] * d * (0.7 + 0.6 * rng()), P.maxKick * d);
  return { kind, at, side, kick: [kx * mag, ky * mag] };
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
  wind: Point = [0, 0],
  force?: EventKind,
): ShotGeometry {
  const mag = Math.hypot(pull[0], pull[1]);
  const dir: Point = mag > 0 ? [pull[0] / mag, pull[1] / mag] : [0, -1];
  const d = pullToRange(mag, dMax, P);
  const aim: Point = [anchor[0] + dir[0] * d, anchor[1] + dir[1] * d];
  const s = dMax > 0 ? d / dMax : 0;
  const drift: Point = [wind[0] * s, wind[1] * s];
  const residual: Point = [gaussian(rng) * P.wind.residualSigma * d, gaussian(rng) * P.wind.residualSigma * d];
  const event = sampleEvent(rng, P.events, dir, d, force, eventRateForWind(wind, P));
  const kick = event?.kick ?? ([0, 0] as const);
  const windTotal: Point = [drift[0] + residual[0], drift[1] + residual[1]];
  const landing: Point = [aim[0] + windTotal[0] + kick[0], aim[1] + windTotal[1] + kick[1]];
  return { dir, d, aim, wind: windTotal, drift, event, landing };
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
