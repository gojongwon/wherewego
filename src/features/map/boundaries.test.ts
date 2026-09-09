import { describe, expect, it } from 'vitest';
import topoJson from './data/sgg.topo.json';
import { sidoBoundaries } from './boundaries';
import { REGIONS } from './index';
import type { Topology } from './topo';

const topo = topoJson as unknown as Topology;

describe('sidoBoundaries', () => {
  const lines = sidoBoundaries(topo);
  const totalArcs = topo.arcs.length;

  it('전체 arc의 일부만 시도 경계·해안이다', () => {
    expect(lines.length).toBeGreaterThan(50);
    expect(lines.length).toBeLessThan(totalArcs);
  });

  it('같은 시도 안 내부 경계는 빠진다 — 서울 종로구·중구 경계는 포함되지 않는다', () => {
    // 종로구(11010)와 중구(11020)가 공유하는 arc를 찾아 결과에 없는지 확인
    const geoms = topo.objects[Object.keys(topo.objects)[0]].geometries;
    const arcsOf = (code: string) => {
      const g = geoms.find((x) => x.properties.code === code)!;
      const polys = (g.type === 'Polygon' ? [g.arcs] : g.arcs) as number[][][];
      return new Set(polys.flat(2).map((i) => (i < 0 ? ~i : i)));
    };
    const shared = [...arcsOf('11010')].filter((a) => arcsOf('11020').has(a));
    expect(shared.length).toBeGreaterThan(0);
    const [sx, sy] = topo.transform.scale;
    const [tx, ty] = topo.transform.translate;
    const firstPointOf = (a: number) => [topo.arcs[a][0][0] * sx + tx, topo.arcs[a][0][1] * sy + ty];
    for (const a of shared) {
      const [lon, lat] = firstPointOf(a);
      expect(lines.some((l) => Math.abs(l[0][0] - lon) < 1e-9 && Math.abs(l[0][1] - lat) < 1e-9)).toBe(false);
    }
  });

  it('모든 점이 시군구 데이터 범위 안이다', () => {
    let n = 0;
    for (const l of lines)
      for (const [lon, lat] of l) {
        n++;
        expect(lon).toBeGreaterThan(124);
        expect(lon).toBeLessThan(130);
        expect(lat).toBeGreaterThan(33);
        expect(lat).toBeLessThan(39);
      }
    expect(n).toBeGreaterThan(1000);
    expect(REGIONS.length).toBe(249);
  });
});
