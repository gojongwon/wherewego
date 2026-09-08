import type { Point } from '@/shared/geo';

/**
 * 조준 상태 — React state가 아니라 mutable 객체. InputLayer가 pointermove마다 덮어쓰고,
 * 씬(Bow·AimGuide)이 useFrame에서 읽는다. 프레임당 setState 0 (설계서 §9.3).
 */
export interface AimState {
  active: boolean;
  /** 발사 방향 단위벡터 (레이아웃 좌표, 당긴 반대쪽) */
  dir: Point;
  /** 사거리 px */
  d: number;
  /** 당김 크기 px */
  mag: number;
  /** 당김 비율 0..1 (게이지) */
  ratio: number;
}

export const createAimState = (): AimState => ({ active: false, dir: [0, -1], d: 0, mag: 0, ratio: 0 });
