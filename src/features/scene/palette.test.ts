import { describe, expect, it } from 'vitest';
import { contrast } from '@/shared/tokens/contrast';
import { SCENE_COLORS } from './palette';

describe('SCENE_COLORS — A안 종이', () => {
  it('육지는 한 톤이고 바다와 구분된다', () => {
    expect(SCENE_COLORS.land).toMatch(/^#[0-9a-f]{6}$/i);
    expect(SCENE_COLORS.land.toLowerCase()).not.toBe(SCENE_COLORS.water.toLowerCase());
    expect(contrast(SCENE_COLORS.land, SCENE_COLORS.water)).toBeGreaterThan(1.05);
  });
  it('경계선 위계: 시도·해안 선이 시군구 선보다 육지 위에서 더 진하다', () => {
    const sgg = contrast(SCENE_COLORS.landEdge, SCENE_COLORS.land);
    const sido = contrast(SCENE_COLORS.sidoEdge, SCENE_COLORS.land);
    expect(sgg).toBeGreaterThan(1.3);
    expect(sido).toBeGreaterThan(sgg);
  });
  it('하이라이트(결과)는 육지·바다 위에서 유일하게 튀는 색', () => {
    expect(contrast(SCENE_COLORS.highlight, SCENE_COLORS.land)).toBeGreaterThanOrEqual(2);
    expect(contrast(SCENE_COLORS.highlight, SCENE_COLORS.water)).toBeGreaterThanOrEqual(2);
  });
  it('활·화살 재질 토큰이 모두 있다', () => {
    for (const k of ['limb', 'siyah', 'stripe', 'grip', 'band', 'string'] as const) {
      expect(SCENE_COLORS.bow[k]).toMatch(/^#[0-9a-f]{6}$/i);
    }
    expect(SCENE_COLORS.arrowShaft).toMatch(/^#[0-9a-f]{6}$/i);
  });
});
