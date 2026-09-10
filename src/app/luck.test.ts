import { describe, expect, it } from 'vitest';
import { computeLayout } from './layout';
import { applyLuck, pickLuckLanding } from './luck';
import { MAINLAND_CENTER_LON, MAINLAND_EXTENT, PACKS, findRegion, fitMercator, pointInRegion, toScreen } from '@/features/map';
import { PARAMS } from '@/shared/params';
import type { ScreenRegion } from '@/features/map';
import type { ShotGeometry } from '@/features/shooter';

function box(code: string, x0: number, y0: number, x1: number, y1: number): ScreenRegion {
  const rings = [
    [
      [x0, y0],
      [x1, y0],
      [x1, y1],
      [x0, y1],
      [x0, y0],
    ] as [number, number][],
  ];
  return {
    region: { code, name: code, polygons: [rings], rings },
    rings,
    bbox: [x0, y0, x1, y1],
  };
}

const seq = (values: number[]) => {
  let i = 0;
  return () => values[i++ % values.length]!;
};

const geometry: ShotGeometry = {
  dir: [0, -1],
  d: 300,
  aim: [100, 400],
  wind: [10, -4],
  drift: [10, -4],
  event: null,
  landing: [110, 396],
};

describe('pickLuckLanding', () => {
  it('시군구를 균등으로 고른다', () => {
    const a = box('A', 0, 0, 10, 10);
    const b = box('B', 20, 0, 30, 10);
    const p = pickLuckLanding([a, b], seq([0.9, 0.5, 0.5]));
    expect(pointInRegion(p, b)).toBe(true);
  });
});

describe('applyLuck', () => {
  const screen = [box('A', 0, 0, 20, 20), box('B', 80, 0, 100, 20)];

  it('착지가 조준+바람+킥이고 사건이 있다', () => {
    const shot = applyLuck(geometry, screen, seq([0.1, 0.5, 0.5, 0.2]));
    expect(shot.event).not.toBeNull();
    expect(shot.landing[0]).toBeCloseTo(shot.aim[0] + shot.wind[0] + shot.event!.kick[0], 8);
    expect(shot.landing[1]).toBeCloseTo(shot.aim[1] + shot.wind[1] + shot.event!.kick[1], 8);
    expect(pointInRegion(shot.landing, screen[0])).toBe(true);
  });

  it('한국 팩에서 항상 육지에 꽂힌다', () => {
    const layout = computeLayout(390, 844);
    const proj = fitMercator(PACKS.kr.regions, layout.mapBox, {
      extent: MAINLAND_EXTENT,
      align: 'top',
      centerLon: MAINLAND_CENTER_LON,
    });
    const kr = toScreen(PACKS.kr.regions, proj);
    const codes = new Set<string>();
    for (let n = 0; n < 80; n++) {
      const shot = applyLuck(geometry, kr, Math.random);
      const hit = findRegion(shot.landing, kr, proj, PARAMS.snapKm);
      expect(hit).not.toBeNull();
      expect(hit!.snapped).toBe(false);
      codes.add(PACKS.kr.regions[hit!.index].code);
    }
    expect(codes.size).toBeGreaterThan(20);
  });
});
