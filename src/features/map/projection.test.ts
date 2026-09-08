import { describe, expect, it } from 'vitest';
import { REGIONS } from './index';
import { fitMercator } from './projection';

const box = { x: 18, y: 105, width: 354, height: 520 };

describe('fitMercator', () => {
  const proj = fitMercator(REGIONS, box);

  it('모든 정점이 box 안에 들어간다', () => {
    for (const r of REGIONS)
      for (const ring of r.rings)
        for (const ll of ring) {
          const [x, y] = proj.project(ll);
          expect(x).toBeGreaterThanOrEqual(box.x - 1e-6);
          expect(x).toBeLessThanOrEqual(box.x + box.width + 1e-6);
          expect(y).toBeGreaterThanOrEqual(box.y - 1e-6);
          expect(y).toBeLessThanOrEqual(box.y + box.height + 1e-6);
        }
  });

  it('invert(project(p)) ≈ p — y 부호 회귀 방지 (설계서 부록 B)', () => {
    const samples: [number, number][] = [
      [126.9784, 37.5665], // 서울시청
      [129.0756, 35.1796], // 부산
      [126.5312, 33.4996], // 제주
      [128.8761, 37.7519], // 강릉
    ];
    for (const p of samples) {
      const back = proj.invert(proj.project(p));
      expect(back[0]).toBeCloseTo(p[0], 6);
      expect(back[1]).toBeCloseTo(p[1], 6);
    }
  });

  it('북쪽이 화면 위(y 작음), 동쪽이 화면 오른쪽(x 큼)', () => {
    const seoul = proj.project([126.9784, 37.5665]);
    const busan = proj.project([129.0756, 35.1796]);
    expect(seoul[1]).toBeLessThan(busan[1]);
    expect(seoul[0]).toBeLessThan(busan[0]);
  });
});
