import { describe, expect, it } from 'vitest';
import { computeLayout } from '@/app/layout';
import { REGIONS } from './index';
import { MAINLAND_CENTER_LON, MAINLAND_EXTENT, JP_EXTENT, JP_ROTATE_DEG, fitMercator } from './projection';
import { PACKS } from './packs';

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
  const loose = fitMercator(REGIONS, box, {
    extent: { lon: [126.05, 129.65], lat: [33.15, 38.65] },
    align: 'bottom',
  });

  it('extent 남단이 box 하단에 닿고, 좌우는 가운데', () => {
    const [x0, yBottom] = proj.project([MAINLAND_EXTENT.lon[0], MAINLAND_EXTENT.lat[0]]);
    const [x1] = proj.project([MAINLAND_EXTENT.lon[1], MAINLAND_EXTENT.lat[0]]);
    expect(yBottom).toBeCloseTo(box.y + box.height, 6);
    expect((x0 + x1) / 2).toBeCloseTo(box.x + box.width / 2, 6);
  });

  it('본토·제주는 box 안, 서해 5도(백령도)는 왼쪽 밖으로 나가도 된다', () => {
    const jeju = proj.project([126.5312, 33.4996]);
    const jejuWest = proj.project([126.16, 33.25]);
    const goseong = proj.project([128.4678, 38.3806]); // 강원 고성
    for (const [x, y] of [jeju, jejuWest, goseong]) {
      expect(x).toBeGreaterThanOrEqual(box.x);
      expect(x).toBeLessThanOrEqual(box.x + box.width);
      expect(y).toBeGreaterThanOrEqual(box.y);
      expect(y).toBeLessThanOrEqual(box.y + box.height);
    }
    const baengnyeong = proj.project([124.7, 37.96]);
    expect(baengnyeong[0]).toBeLessThan(box.x);
  });

  it('extent를 조이면 축척이 커진다', () => {
    expect(proj.k).toBeGreaterThan(loose.k);
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

  it('본토·제주는 centerLon 보정 후에도 box 안', () => {
    for (const ll of [
      [125.9, 34.25],
      [126.16, 33.25],
      [126.5312, 33.4996],
      [126.45, 37.45],
      [128.4678, 38.3806],
    ] as const) {
      const [x, y] = proj.project(ll);
      expect(x).toBeGreaterThanOrEqual(box.x);
      expect(x).toBeLessThanOrEqual(box.x + box.width);
      expect(y).toBeGreaterThanOrEqual(box.y);
      expect(y).toBeLessThanOrEqual(box.y + box.height);
    }
  });

  it('extent 중앙보다 동쪽이라 본토가 왼쪽으로 온다 (서·동해 여백)', () => {
    const lon = (MAINLAND_EXTENT.lon[0] + MAINLAND_EXTENT.lon[1]) / 2;
    expect(proj.project([lon, 36])[0]).toBeLessThan(base.project([lon, 36])[0]);
  });
});

describe('fitMercator — top 정렬', () => {
  const proj = fitMercator(REGIONS, box, { extent: MAINLAND_EXTENT, align: 'top' });

  it('extent 북단이 box 상단에 닿는다', () => {
    const [, yTop] = proj.project([MAINLAND_CENTER_LON, MAINLAND_EXTENT.lat[1]]);
    expect(yTop).toBeCloseTo(box.y, 6);
  });
});

describe('fitMercator — 390×844 스마트폰에서 한반도가 잘리지 않는다', () => {
  const layout = computeLayout(390, 844);
  const proj = fitMercator(REGIONS, layout.mapBox, {
    extent: MAINLAND_EXTENT,
    align: 'top',
    centerLon: MAINLAND_CENTER_LON,
  });
  const { mapBox } = layout;

  it('진도·제주 서쪽·강화·울산·고성이 mapBox 안', () => {
    for (const ll of [
      [125.9, 34.25],
      [126.16, 33.25],
      [126.38, 34.79],
      [126.16, 37.68],
      [129.31, 35.54],
      [128.4678, 38.3806],
    ] as const) {
      const [x, y] = proj.project(ll);
      expect(x).toBeGreaterThanOrEqual(mapBox.x);
      expect(x).toBeLessThanOrEqual(mapBox.x + mapBox.width);
      expect(y).toBeGreaterThanOrEqual(mapBox.y);
      expect(y).toBeLessThanOrEqual(mapBox.y + mapBox.height);
    }
  });
});

describe('fitMercator — 일본 한 장 (열도 회전)', () => {
  const layout = computeLayout(390, 844);
  const opts = { extent: JP_EXTENT, align: 'top' as const, rotateDeg: JP_ROTATE_DEG };
  const proj = fitMercator(PACKS.jp.regions, layout.mapBox, opts);
  const upright = fitMercator(PACKS.jp.regions, layout.mapBox, { extent: JP_EXTENT, align: 'top' });
  const { mapBox } = layout;

  it('북쪽 위를 유지한 채 축척이 커진다', () => {
    expect(proj.k).toBeGreaterThan(upright.k);
    const kago = proj.project([130.55, 31.56]);
    const wakkanai = proj.project([141.85, 45.4]);
    expect(wakkanai[1]).toBeLessThan(kago[1]);
  });

  it('invert(project(p)) ≈ p', () => {
    for (const p of [
      [139.76, 35.68],
      [130.55, 31.56],
      [141.35, 43.06],
    ] as const) {
      const back = proj.invert(proj.project(p));
      expect(back[0]).toBeCloseTo(p[0], 5);
      expect(back[1]).toBeCloseTo(p[1], 5);
    }
  });

  it('가고시마·도쿄·삿포로가 mapBox 안', () => {
    for (const ll of [
      [130.55, 31.56],
      [139.76, 35.68],
      [141.35, 43.06],
    ] as const) {
      const [x, y] = proj.project(ll);
      expect(x).toBeGreaterThanOrEqual(mapBox.x);
      expect(x).toBeLessThanOrEqual(mapBox.x + mapBox.width);
      expect(y).toBeGreaterThanOrEqual(mapBox.y);
      expect(y).toBeLessThanOrEqual(mapBox.y + mapBox.height);
    }
  });
});
