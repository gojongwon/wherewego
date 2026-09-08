import type { Point } from '@/shared/geo';
import { LAYOUT, PARAMS } from '@/shared/params';
import type { Box } from '@/features/map';

export interface StageLayout {
  width: number;
  height: number;
  /** 활 앵커 — 하단 중앙 */
  anchor: Point;
  /** 지도가 fit 되는 영역 */
  mapBox: Box;
  /** 최대 사거리 px — 앵커에서 지도 북단 + overshoot */
  dMax: number;
}

/** 설계서 §4.1 와이어프레임의 수치화. 순수 함수 — 테스트 가능. */
export function computeLayout(width: number, height: number): StageLayout {
  const anchor: Point = [width / 2, height - LAYOUT.anchorFromBottom];
  const mapBottom = anchor[1] - LAYOUT.mapBottomGap;
  const mapBox: Box = {
    x: LAYOUT.mapPad,
    y: LAYOUT.mapTop + LAYOUT.mapPad / 2,
    width: width - LAYOUT.mapPad * 2,
    height: mapBottom - LAYOUT.mapTop - LAYOUT.mapPad,
  };
  const dMax = anchor[1] - LAYOUT.mapTop + PARAMS.overshootPx;
  return { width, height, anchor, mapBox, dMax };
}
