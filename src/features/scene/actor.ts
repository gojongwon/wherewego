import type { Object3D } from 'three';
import type { Point } from '@/shared/geo';
import type { FlightEvent } from '@/features/shooter';

/** 프레임마다 액터에 주는 컨텍스트 */
export interface ActorCtx {
  /** 비행 진행 0..1 */
  tau: number;
  /** 초 (프레임 간격, 0.05로 클램프) */
  dt: number;
  /** 초 (연속 시간 — 날갯짓·회전 위상용) */
  time: number;
  ev: FlightEvent;
  /** 사건 지점 (지면 좌표) */
  Pe: Point;
  /** 그 지점에서의 화살 높이 */
  hPe: number;
  stageW: number;
  /** ms. 비행 전체 시간 — 접촉 후 경과 초 = (tau−at)·T/1000 */
  T: number;
}

/** 액터가 씬에 요청할 수 있는 효과 */
export interface ActorFx {
  /** 카메라 흔들림 px */
  shake(amp: number): void;
  /** 화살 스핀 (돌풍) */
  arrowSpin(turns: number): void;
}

export interface ActorInstance {
  /** 액터 본체 — 씬에 추가 */
  group: Object3D;
  /** 그림자·파티클 등 함께 추가할 것들 */
  extras: readonly Object3D[];
  update(ctx: ActorCtx): void;
  onImpact(fx: ActorFx, Pe: Point, hPe: number): void;
  reset(): void;
  dispose(): void;
}
