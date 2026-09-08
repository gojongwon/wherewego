import { describe, expect, it } from 'vitest';
import { Box3, Color, Mesh } from 'three';
import { REGIONS, fitMercator } from '@/features/map';
import { buildTerrain, extrudeColored, outlineGeometry, polygonToShape } from './geometry';

const square = (x: number, y: number, s: number) =>
  [
    [x, y],
    [x + s, y],
    [x + s, y + s],
    [x, y + s],
    [x, y],
  ] as const;

describe('polygonToShape', () => {
  it('첫 링은 외곽, 나머지는 holes. 닫힘 중복점은 제거', () => {
    const shape = polygonToShape([square(0, 0, 100), square(40, 40, 20)]);
    expect(shape.getPoints().length).toBeGreaterThan(0);
    expect(shape.holes).toHaveLength(1);
    expect(shape.curves).toHaveLength(3); // 4점 → 선분 3개 (닫힘은 autoClose)
  });
});

describe('extrudeColored', () => {
  it('월드 y ∈ [0, depth], x/z는 입력 범위, 정점색 3채널', () => {
    const g = extrudeColored(polygonToShape([square(10, 20, 100)]), 8, new Color('#ff0000'), new Color('#800000'));
    const bb = new Box3().setFromObject(new Mesh(g));
    expect(bb.min.y).toBeCloseTo(0);
    expect(bb.max.y).toBeCloseTo(8);
    expect(bb.min.x).toBeCloseTo(10);
    expect(bb.max.x).toBeCloseTo(110);
    expect(bb.min.z).toBeCloseTo(20);
    expect(bb.max.z).toBeCloseTo(120);
    expect(g.attributes.color.itemSize).toBe(3);
    expect(g.attributes.normal).toBeUndefined();
  });
});

describe('buildTerrain (실데이터 249)', () => {
  it('병합 지오메트리 하나, 정점 > 0', () => {
    const projection = fitMercator(REGIONS, { x: 18, y: 105, width: 354, height: 520 });
    const shapes = REGIONS.map((r) => r.polygons.map((poly) => polygonToShape(poly.map((ring) => ring.map((ll) => projection.project(ll))))));
    expect(shapes).toHaveLength(249);
    const g = buildTerrain(shapes, 8, (i) => (i % 2 ? '#cfe0b8' : '#f3e3a8'));
    expect(g.attributes.position.count).toBeGreaterThan(50_000);
    expect(g.attributes.color.count).toBe(g.attributes.position.count);
  });
});

describe('outlineGeometry', () => {
  it('N점 링 → N−1 세그먼트(2N−2 정점), 높이 y 고정', () => {
    const g = outlineGeometry([square(0, 0, 10)], 8.2);
    expect(g.attributes.position.count).toBe(8);
    const ys = Array.from({ length: 8 }, (_, i) => g.attributes.position.getY(i));
    for (const y of ys) expect(y).toBeCloseTo(8.2, 5); // Float32 저장
  });
});
