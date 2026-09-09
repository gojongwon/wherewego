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
  compact: boolean;
}

/** 짧은 화면에서는 하단 활 공간을 줄여 지도를 키운다. safeTop은 노치·상태바. */
export function computeLayout(width: number, height: number, safeTop = 0): StageLayout {
  const compact = height < LAYOUT.compactBelow;
  const mapTop = (compact ? 72 : LAYOUT.mapTop) + safeTop;
  const fromBottom = compact ? 112 : LAYOUT.anchorFromBottom;
  const gap = compact ? LAYOUT.mapBottomGapCompact : LAYOUT.mapBottomGap;
  const pad = compact ? 12 : LAYOUT.mapPad;
  const anchor: Point = [width / 2, height - fromBottom];
  const mapBottom = anchor[1] - gap;
  const mapBox: Box = {
    x: pad,
    y: mapTop + pad / 2,
    width: width - pad * 2,
    height: mapBottom - mapTop - pad,
  };
  const dMax = anchor[1] - mapTop + PARAMS.overshootPx;
  return { width, height, anchor, mapBox, dMax, compact };
}
