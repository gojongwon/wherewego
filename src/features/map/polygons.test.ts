import { describe, expect, it } from 'vitest';
import { REGIONS } from './index';

describe('Region.polygons (3D extrude용 구조)', () => {
  it('구멍이 있는 시군구는 화성시·광양시뿐', () => {
    const withHoles = REGIONS.filter((r) => r.polygons.some((p) => p.length > 1))
      .map((r) => r.name)
      .sort();
    expect(withHoles).toEqual(['광양시', '화성시']);
  });
  it('rings는 polygons를 평탄화한 것과 같다 (판정 로직 불변)', () => {
    for (const r of REGIONS) expect(r.rings).toEqual(r.polygons.flat());
  });
});
