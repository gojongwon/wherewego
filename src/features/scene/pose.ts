import type { Point } from '@/shared/geo';
import { clamp } from '@/shared/geo';
import { easeOut, heightAt } from '@/features/shooter';

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

/**
 * 비행 자세 (설계서 §5.4의 3D판). 수평은 easeOut, 높이는 4τ(1−τ)·apexH.
 * pitch = atan2(vy, v수평); easeOut'(1)=0 이라 τ→1에서 −90°로 가므로 −pinPitch로 클램프 → 정확히 핀 각도로 꽂힌다.
 */
export function flightPose(tau: number, anchor: Point, landing: Point, apexH: number, pinPitch: number): FlightPose {
  const dx = landing[0] - anchor[0];
  const dz = landing[1] - anchor[1];
  const D = Math.hypot(dx, dz);
  const e = easeOut(tau);
  const h = heightAt(tau);
  const vPlane = D * 1.6 * Math.pow(1 - tau, 0.6);
  const vy = apexH * 4 * (1 - 2 * tau);
  return {
    x: anchor[0] + dx * e,
    y: apexH * h,
    z: anchor[1] + dz * e,
    yaw: yawOf(dx, dz),
    pitch: Math.max(Math.atan2(vy, vPlane), -pinPitch),
    h,
  };
}
