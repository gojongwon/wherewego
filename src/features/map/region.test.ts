import { describe, expect, it } from 'vitest';
import type { Point } from '@/shared/geo';
import { REGIONS } from './index';
import { fitMercator } from './projection';
import { findRegion, inRing, pointInRegion, toScreen, type ScreenRegion } from './region';

const square = (x: number, y: number, s: number): Point[] => [
  [x, y],
  [x + s, y],
  [x + s, y + s],
  [x, y + s],
];

describe('inRing / pointInRegion', () => {
  it('사각형 안·밖', () => {
    const ring = square(0, 0, 10);
    expect(inRing([5, 5], ring)).toBe(true);
    expect(inRing([15, 5], ring)).toBe(false);
  });

  it('구멍(even-odd): 외곽 안이지만 구멍 안이면 밖', () => {
    const sr: ScreenRegion = {
      region: { code: '00000', name: 'T', rings: [] },
      rings: [square(0, 0, 10), square(4, 4, 2)],
      bbox: [0, 0, 10, 10],
    };
    expect(pointInRegion([1, 1], sr)).toBe(true);
    expect(pointInRegion([5, 5], sr)).toBe(false); // 구멍 안
    expect(pointInRegion([20, 20], sr)).toBe(false); // bbox 밖
  });
});

describe('findRegion (실데이터)', () => {
  const box = { x: 18, y: 105, width: 354, height: 520 };
  const proj = fitMercator(REGIONS, box);
  const screen = toScreen(REGIONS, proj);
  const nameAt = (lon: number, lat: number) => {
    const hit = findRegion(proj.project([lon, lat]), screen, proj, 30);
    return hit ? { name: REGIONS[hit.index].name, snapped: hit.snapped } : null;
  };

  it('육지 좌표 → 해당 시군구', () => {
    expect(nameAt(126.9784, 37.5665)).toEqual({ name: '중구', snapped: false }); // 서울시청
    expect(nameAt(128.8761, 37.7519)).toEqual({ name: '강릉시', snapped: false });
    expect(nameAt(126.5312, 33.4996)).toEqual({ name: '제주시', snapped: false });
  });

  it('해안 근처 바다 → 가까운 시군구로 스냅', () => {
    const r = nameAt(129.35, 35.18); // 부산 동쪽 해상 ~10km
    expect(r?.snapped).toBe(true);
    expect(['기장군', '해운대구', '수영구', '남구']).toContain(r?.name);
  });

  it('먼 바다 → 헛발(null)', () => {
    expect(nameAt(125.5, 34.0)).toBeNull(); // 서해 남부 먼바다
  });
});
