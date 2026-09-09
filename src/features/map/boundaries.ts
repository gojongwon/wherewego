import type { LonLat } from '@/shared/geo';
import { provinceOf } from './names';
import type { Topology } from './topo';

export type BoundaryGroup = (props: { code: string; name: string }) => string;

/**
 * 시/도 경계 + 해안선 폴리라인 (경위도).
 * TopoJSON의 arc 공유 구조를 이용한다: 한 arc를 쓰는 시군구들의 시도가 서로 다르면 시도 경계,
 * 한 시군구만 쓰면 해안(또는 외곽). 같은 시도의 시군구끼리만 공유하는 arc는 내부 경계라 제외.
 * 데이터 파이프라인에 시도 레이어를 추가하지 않고도 경계 위계를 그릴 수 있다 (설계서 §4.3).
 * 기본 group은 provinceOf라 군위군→대구 보정이 경계에도 반영된다.
 */
export function sidoBoundaries(
  topo: Topology,
  opts: { layer?: string; group?: BoundaryGroup; include?: (props: { code: string; name: string }) => boolean } = {},
): LonLat[][] {
  const layerName = opts.layer ?? Object.keys(topo.objects)[0];
  const group = opts.group ?? provinceOf;
  const collection = topo.objects[layerName];
  if (!collection) throw new Error(`TopoJSON layer not found: ${layerName}`);

  const users = new Map<number, Set<string>>();
  const refs = new Map<number, number>();
  for (const g of collection.geometries) {
    if (opts.include && !opts.include(g.properties)) continue;
    const province = group(g.properties);
    const polys = (g.type === 'Polygon' ? [g.arcs] : g.arcs) as number[][][];
    for (const poly of polys)
      for (const ring of poly)
        for (const i of ring) {
          const a = i < 0 ? ~i : i;
          if (!users.has(a)) users.set(a, new Set());
          users.get(a)!.add(province);
          refs.set(a, (refs.get(a) ?? 0) + 1);
        }
  }

  const [sx, sy] = topo.transform.scale;
  const [tx, ty] = topo.transform.translate;
  const out: LonLat[][] = [];
  users.forEach((provinces, a) => {
    if (provinces.size < 2 && (refs.get(a) ?? 0) > 1) return; // 같은 시도 안 내부 경계
    let x = 0;
    let y = 0;
    out.push(
      topo.arcs[a].map(([dx, dy]) => {
        x += dx;
        y += dy;
        return [x * sx + tx, y * sy + ty] as const;
      }),
    );
  });
  return out;
}
