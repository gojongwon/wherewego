import { tokens } from '@/shared/tokens/tokens';

/**
 * 씬에서 쓰는 색 — tokens.ts를 읽는 유일한 파일. 조명·톤매핑이 없으므로 hex가 그대로 렌더된다.
 * A안 '종이': 바다 한 톤 + 육지 한 톤 + 강조 하나. 시도별 채색은 없고 경계선 2단(시군구 가늘게 / 시도·해안 굵게)으로 구조를 준다.
 */
export const SCENE_COLORS = {
  paper: tokens.map.paper,
  water: tokens.map.water,
  waterDeep: tokens.map['water-deep'],
  land: tokens.map.land,
  landEdge: tokens.map['land-edge'],
  sidoEdge: tokens.map['sido-edge'],
  highlight: tokens.map.highlight,
  arrowInk: tokens.map.arrow.ink,
  arrowAccent: tokens.map.arrow.accent,
  arrowShaft: tokens.map.arrow.shaft,
  bow: tokens.map.bow,
  impact: tokens.map.impact,
  pinMiss: tokens.map['pin-miss'],
  actor: tokens.map.actor,
  shadow: tokens.map.shadow.color,
  shadowOpacity: tokens.map.shadow.opacity,
} as const;
