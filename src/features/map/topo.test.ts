import { describe, expect, it } from 'vitest';
import { decodeTopo, type Topology } from './topo';
import { REGIONS } from './index';

/** 두 사각형이 한 변을 공유하는 최소 토폴로지 (arc 1을 공유, 두 번째 도형은 역방향 ~1) */
const tiny: Topology = {
  type: 'Topology',
  transform: { scale: [0.001, 0.001], translate: [126, 36] },
  arcs: [
    [[0, 0], [1000, 0]], // arc0: (126,36) → (127,36)
    [[1000, 0], [0, 1000]], // arc1: (127,36) → (127,37)  [공유 변]
    [[1000, 1000], [-1000, 0], [0, -1000]], // arc2: (127,37) → (126,37) → (126,36)
    [[1000, 0], [1000, 0], [0, 1000], [-1000, 0]], // arc3: (127,36) → (128,36) → (128,37) → (127,37)
  ],
  objects: {
    sgg: {
      type: 'GeometryCollection',
      geometries: [
        { type: 'Polygon', arcs: [[0, 1, 2]], properties: { code: '11010', name: 'A' } },
        { type: 'Polygon', arcs: [[3, -2]], properties: { code: '11020', name: 'B' } },
      ],
    },
  },
};

describe('decodeTopo', () => {
  it('델타·양자화를 풀어 경위도 링을 만든다', () => {
    const [a] = decodeTopo(tiny);
    expect(a.code).toBe('11010');
    expect(a.rings).toHaveLength(1);
    // arc 연결 시 중복 점 제거: 2 + 1 + 2 = 5점 (닫는 점 포함)
    expect(a.rings[0]).toHaveLength(5);
    expect(a.rings[0][0]).toEqual([126, 36]);
    expect(a.rings[0][1][0]).toBeCloseTo(127);
    expect(a.rings[0][2]).toEqual([127, 37]);
  });

  it('음수 인덱스(~i)는 arc를 역방향으로 잇는다', () => {
    const [, b] = decodeTopo(tiny);
    const ring = b.rings[0];
    // arc3 (4점) + arc1 역방향(첫 점 제거, 1점) = 5점, 마지막 점은 시작점으로 돌아옴
    expect(ring).toHaveLength(5);
    expect(ring.at(-1)).toEqual([127, 36]);
  });

  it('번들 데이터: 시군구 249개, 울릉군 없음, 모든 코드 5자리', () => {
    expect(REGIONS).toHaveLength(249);
    expect(REGIONS.some((r) => r.name === '울릉군')).toBe(false);
    for (const r of REGIONS) expect(r.code).toMatch(/^\d{5}$/);
    // 경위도 범위 (남한 본토+제주+서해 섬)
    for (const r of REGIONS)
      for (const ring of r.rings)
        for (const [lon, lat] of ring) {
          expect(lon).toBeGreaterThan(124);
          expect(lon).toBeLessThan(130);
          expect(lat).toBeGreaterThan(33);
          expect(lat).toBeLessThan(39);
        }
  });
});
