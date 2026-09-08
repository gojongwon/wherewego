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
