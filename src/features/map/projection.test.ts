import { describe, expect, it } from 'vitest';
import { REGIONS } from './index';
import { MAINLAND_CENTER_LON, MAINLAND_EXTENT, fitMercator } from './projection';

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

describe('fitMercator — 본토 기준 extent + bottom 정렬 (A안)', () => {
  const proj = fitMercator(REGIONS, box, { extent: MAINLAND_EXTENT, align: 'bottom' });

  it('extent 남단이 box 하단에 닿고, 좌우는 가운데', () => {
    const [x0, yBottom] = proj.project([MAINLAND_EXTENT.lon[0], MAINLAND_EXTENT.lat[0]]);
    const [x1] = proj.project([MAINLAND_EXTENT.lon[1], MAINLAND_EXTENT.lat[0]]);
    expect(yBottom).toBeCloseTo(box.y + box.height, 6);
    expect((x0 + x1) / 2).toBeCloseTo(box.x + box.width / 2, 6);
  });

  it('본토·제주는 box 안, 서해 5도(백령도)는 왼쪽 밖으로 나가도 된다', () => {
    const jeju = proj.project([126.5312, 33.4996]);
    const goseong = proj.project([128.4678, 38.3806]); // 강원 고성
    for (const [x, y] of [jeju, goseong]) {
      expect(x).toBeGreaterThanOrEqual(box.x);
      expect(x).toBeLessThanOrEqual(box.x + box.width);
      expect(y).toBeGreaterThanOrEqual(box.y);
      expect(y).toBeLessThanOrEqual(box.y + box.height);
    }
    const baengnyeong = proj.project([124.7, 37.96]);
    expect(baengnyeong[0]).toBeLessThan(box.x);
  });

  it('extent를 써도 invert(project(p)) ≈ p', () => {
    const p: [number, number] = [128.8761, 37.7519];
    const back = proj.invert(proj.project(p));
    expect(back[0]).toBeCloseTo(p[0], 6);
    expect(back[1]).toBeCloseTo(p[1], 6);
  });
});

describe('fitMercator — centerLon (가로 시각 중심 보정)', () => {
  const base = fitMercator(REGIONS, box, { extent: MAINLAND_EXTENT, align: 'bottom' });
  const proj = fitMercator(REGIONS, box, { extent: MAINLAND_EXTENT, align: 'bottom', centerLon: MAINLAND_CENTER_LON });

  it('centerLon이 box 가로 중앙에 오고 축척은 같다', () => {
    expect(proj.project([MAINLAND_CENTER_LON, 36])[0]).toBeCloseTo(box.x + box.width / 2, 6);
    expect(proj.k).toBeCloseTo(base.k, 9);
  });
  it('extent 중앙보다 동쪽이라 지도 전체가 오른쪽으로 옮겨진다 (서해 섬에 여백)', () => {
    const lon = (MAINLAND_EXTENT.lon[0] + MAINLAND_EXTENT.lon[1]) / 2;
    expect(proj.project([lon, 36])[0]).toBeLessThan(base.project([lon, 36])[0]);
    const shift = base.project([lon, 36])[0] - proj.project([lon, 36])[0];
    expect(shift).toBeGreaterThan(5);
    expect(shift).toBeLessThan(25);
  });
});
