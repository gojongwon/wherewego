import type { Point } from '@/shared/geo';
import { clamp } from '@/shared/geo';
import { easeOut, heightAt, type FlightEvent } from '@/features/shooter';

export interface FlightPose {
  x: number;
  /** 높이 (world y) */
  y: number;
  z: number;
  /** rotation.y — 진행 방위 */
  yaw: number;
  /** rotation.z — 속도 벡터 기울기 (위 +). 착지 직전 −pinPitch로 수렴 */
  pitch: number;
  /** 가짜 높이 0..1 */
  h: number;
}

/** 정점 높이 — 사거리에 비례, 30..160 unit */
export function apexHeight(d: number, apexRatio: number): number {
  return clamp(apexRatio * d, 30, 160);
}

/** 레이아웃 방향 (dx, dy) → rotation.y. world x=x, z=y; +x를 y축으로 a만큼 돌리면 (cos a, −sin a) */
export const yawOf = (dx: number, dy: number): number => -Math.atan2(dy, dx);

function poseAlong(
  tau: number,
  localTau: number,
  from: Point,
  to: Point,
  apexH: number,
  pinPitch: number,
): FlightPose {
  const dx = to[0] - from[0];
  const dz = to[1] - from[1];
  const D = Math.hypot(dx, dz);
  const e = easeOut(localTau);
  const h = heightAt(tau);
  const vPlane = D * 1.6 * Math.pow(1 - localTau, 0.6);
  const vy = apexH * 4 * (1 - 2 * tau);
  return {
    x: from[0] + dx * e,
    y: apexH * h,
    z: from[1] + dz * e,
    yaw: yawOf(dx, dz),
    pitch: Math.max(Math.atan2(vy, vPlane), -pinPitch),
    h,
  };
}

/**
 * 비행 자세 (설계서 §5.4의 3D판). 사건이 있으면 at에서 L0→landing으로 꺾인다.
 * pitch = atan2(vy, v수평); easeOut'(1)=0 이라 τ→1에서 −90°로 가므로 −pinPitch로 클램프.
 */
export function flightPose(
  tau: number,
  anchor: Point,
  landing: Point,
  apexH: number,
  pinPitch: number,
  event?: FlightEvent | null,
): FlightPose {
  const kick = event?.kick ?? ([0, 0] as const);
  const L0: Point = [landing[0] - kick[0], landing[1] - kick[1]];
  if (!event || tau < event.at) return poseAlong(tau, tau, anchor, L0, apexH, pinPitch);
  const eAt = easeOut(event.at);
  const Pe: Point = [anchor[0] + (L0[0] - anchor[0]) * eAt, anchor[1] + (L0[1] - anchor[1]) * eAt];
  const u = (tau - event.at) / (1 - event.at);
  return poseAlong(tau, u, Pe, landing, apexH, pinPitch);
}
