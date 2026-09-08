import { BufferGeometry, Color, ExtrudeGeometry, Float32BufferAttribute, Path, Shape, Vector2 } from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { Point } from '@/shared/geo';

/**
 * Shape 좌표계 = (x, −y). ExtrudeGeometry 후 rotateX(−π/2)를 적용하면 월드 (x, 0..depth, y)가 된다.
 * 즉 레이아웃 px (x, y)를 shape에 넣을 때 y 부호만 뒤집는다.
 */
export function roundedRectShape(x: number, y: number, w: number, h: number, r: number): Shape {
  const s = new Shape();
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y);
  s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + h - r);
  s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h);
  s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r);
  s.quadraticCurveTo(x, y, x + r, y);
  return s;
}

/** 닫힌 링(첫점=끝점)의 중복 끝점을 버리고 shape 좌표로 */
function ringToVec(ring: readonly Point[]): Vector2[] {
  const pts = ring.map(([x, y]) => new Vector2(x, -y));
  if (pts.length > 1 && pts[0].equals(pts[pts.length - 1])) pts.pop();
  return pts;
}

/** 화면좌표 폴리곤 [외곽, ...구멍] → Shape. 와인딩은 ExtrudeGeometry가 정규화하므로 그룹만 맞으면 된다. */
export function polygonToShape(polygon: readonly (readonly Point[])[]): Shape {
  const shape = new Shape(ringToVec(polygon[0]));
  shape.holes = polygon.slice(1).map((r) => new Path(ringToVec(r)));
  return shape;
}

/** extrude + 정점색 베이크. groups[0]=윗/아랫면(cap), groups[1]=옆면(side). 조명이 없으니 색이 그대로 나온다. */
export function extrudeColored(shape: Shape, depth: number, cap: Color, side: Color): BufferGeometry {
  const g = new ExtrudeGeometry(shape, { depth, bevelEnabled: false });
  g.rotateX(-Math.PI / 2);
  const colors = new Float32Array(g.attributes.position.count * 3);
  for (const grp of g.groups) {
    const c = grp.materialIndex === 0 ? cap : side;
    for (let i = grp.start; i < grp.start + grp.count; i++) {
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
    }
  }
  g.setAttribute('color', new Float32BufferAttribute(colors, 3));
  g.deleteAttribute('normal');
  g.deleteAttribute('uv');
  g.clearGroups();
  return g;
}

/** 옆면 음영 비율 — 종이 컷아웃의 그림자 느낌 */
const SIDE_SHADE = 0.78;

/** 지역별 Shape 묶음 → 병합 지오메트리 하나 (드로우콜 1). capOf(i)는 i번째 지역의 윗면 hex. */
export function buildTerrain(shapesByRegion: readonly (readonly Shape[])[], depth: number, capOf: (i: number) => string): BufferGeometry {
  const parts = shapesByRegion.flatMap((shapes, i) => {
    const cap = new Color(capOf(i));
    const side = cap.clone().multiplyScalar(SIDE_SHADE);
    return shapes.map((s) => extrudeColored(s, depth, cap, side));
  });
  const merged = mergeGeometries(parts, false);
  for (const p of parts) p.dispose();
  if (!merged) throw new Error('terrain merge failed');
  return merged;
}

/** 링들 → LineSegments용 위치 버퍼 (연속 점 쌍), 높이 y */
export function outlineGeometry(rings: readonly (readonly Point[])[], y: number): BufferGeometry {
  let segs = 0;
  for (const r of rings) segs += Math.max(0, r.length - 1);
  const pos = new Float32Array(segs * 6);
  let o = 0;
  for (const r of rings) {
    for (let i = 0; i + 1 < r.length; i++) {
      pos[o++] = r[i][0];
      pos[o++] = y;
      pos[o++] = r[i][1];
      pos[o++] = r[i + 1][0];
      pos[o++] = y;
      pos[o++] = r[i + 1][1];
    }
  }
  const g = new BufferGeometry();
  g.setAttribute('position', new Float32BufferAttribute(pos, 3));
  return g;
}
