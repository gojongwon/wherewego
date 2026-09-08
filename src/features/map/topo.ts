import type { LonLat } from '@/shared/geo';

/** mapshaper가 quantization 옵션으로 내보낸 TopoJSON의 최소 타입 */
export interface Topology {
  type: 'Topology';
  transform: { scale: [number, number]; translate: [number, number] };
  arcs: number[][][];
  objects: Record<string, { type: 'GeometryCollection'; geometries: TopoGeometry[] }>;
}

export interface TopoGeometry {
  type: 'Polygon' | 'MultiPolygon';
  /** Polygon: ring[] (ring = arc index[]), MultiPolygon: polygon[] */
  arcs: number[][] | number[][][];
  properties: { code: string; name: string };
}

export interface Region {
  /** KOSTAT 시군구 코드 (앞 2자리 = 시도) */
  code: string;
  name: string;
  /** 폴리곤별 [외곽, ...구멍] — 3D extrude(THREE.Shape.holes)용으로 구조를 보존 */
  polygons: LonLat[][][];
  /** 외곽·구멍을 평탄화한 링들(= polygons.flat()) — even-odd 판정으로 구멍 자동 처리 */
  rings: LonLat[][];
}

/**
 * TopoJSON → 경위도 링. topojson-client 없이 40줄로 충분한 범위만 구현.
 * - arcs: 첫 점 절대값, 이후 델타. transform으로 양자화 해제
 * - 음수 인덱스 ~i 는 arc i 를 역방향으로
 * - 이어지는 arc의 첫 점은 이전 arc의 마지막 점과 같으므로 하나 버림
 */
export function decodeTopo(topo: Topology, layer?: string): Region[] {
  const layerName = layer ?? Object.keys(topo.objects)[0];
  const collection = topo.objects[layerName];
  if (!collection) throw new Error(`TopoJSON layer not found: ${layerName}`);

  const [sx, sy] = topo.transform.scale;
  const [tx, ty] = topo.transform.translate;
  const arcs: LonLat[][] = topo.arcs.map((arc) => {
    let x = 0;
    let y = 0;
    return arc.map(([dx, dy]) => {
      x += dx;
      y += dy;
      return [x * sx + tx, y * sy + ty] as const;
    });
  });

  const ring = (idxs: number[]): LonLat[] => {
    const pts: LonLat[] = [];
    idxs.forEach((i, k) => {
      let a = i < 0 ? [...arcs[~i]].reverse() : arcs[i];
      if (k > 0) a = a.slice(1);
      for (const p of a) pts.push(p);
    });
    return pts;
  };

  return collection.geometries.map((g) => {
    const polys = (g.type === 'Polygon' ? [g.arcs] : g.arcs) as number[][][];
    const polygons = polys.map((poly) => poly.map(ring));
    return { code: g.properties.code, name: g.properties.name, polygons, rings: polygons.flat() };
  });
}
