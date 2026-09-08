import { tokens } from '@/shared/tokens/tokens';

/** 씬에서 쓰는 색 — tokens.ts를 읽는 유일한 파일. 조명·톤매핑이 없으므로 hex가 그대로 렌더된다. */
export const SCENE_COLORS = {
  paper: tokens.map.paper,
  water: tokens.map.water,
  waterDeep: tokens.map['water-deep'],
  grid: tokens.map.grid,
  land: Object.values(tokens.map.land) as readonly string[],
  landEdge: tokens.map['land-edge'],
  highlight: tokens.map.highlight,
  arrowInk: tokens.map.arrow.ink,
  arrowAccent: tokens.map.arrow.accent,
  impact: tokens.map.impact,
  pinMiss: tokens.map['pin-miss'],
  shadow: tokens.map.shadow.color,
  shadowOpacity: tokens.map.shadow.opacity,
} as const;

/** 시도 이름 → 파스텔 인덱스(0..4). 인접 시도가 같은 색을 갖지 않게 배정 (palette.test). 이름 키라 군위군→대구 보정이 반영된다. */
const PROVINCE_VARIANT: Readonly<Record<string, number>> = {
  서울특별시: 0,
  경기도: 1,
  인천광역시: 2,
  강원특별자치도: 2,
  충청북도: 0,
  충청남도: 3,
  세종특별자치시: 4,
  대전광역시: 2,
  전북특별자치도: 1,
  전라남도: 0,
  광주광역시: 3,
  경상북도: 3,
  대구광역시: 1,
  울산광역시: 0,
  경상남도: 2,
  부산광역시: 4,
  제주특별자치도: 1,
};

export function provinceVariant(province: string): number {
  return PROVINCE_VARIANT[province] ?? 0;
}
