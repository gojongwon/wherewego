import { BufferGeometry, Color, Float32BufferAttribute, Vector3 } from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { SCENE_COLORS } from './palette';

/**
 * 각궁(2번 안) 지오메트리 — 당김 p(0..1)에 따라 활대가 뒤로 휜다.
 * 로컬 좌표: +x = 발사 방향, z = 좌우, y = 높이. 값은 활 후보 목업(SVG, 당김 p)과 같고 BOW_SCALE로 키운다.
 * 프레임마다 다시 만들지 않고 KEYFRAMES개를 미리 만들어 가까운 것을 고른다 (Bow.tsx).
 */
export const BOW_SCALE = 1.35;
export const KEYFRAMES = 13;

type P3 = readonly [number, number, number];
const UP = new Vector3(0, 1, 0);

/** 3차 베지어 (평면 XZ) — 제어점은 [x, z] */
function cubic(P: readonly (readonly [number, number])[], t: number): [number, number] {
  const mt = 1 - t;
  return [
    mt ** 3 * P[0][0] + 3 * mt * mt * t * P[1][0] + 3 * mt * t * t * P[2][0] + t ** 3 * P[3][0],
    mt ** 3 * P[0][1] + 3 * mt * mt * t * P[1][1] + 3 * mt * t * t * P[2][1] + t ** 3 * P[3][1],
  ];
}

/**
 * 가운데 굵고 끝이 가는 튜브. points는 XZ 평면 위 폴리라인, radiusAt(u)는 0..1 구간의 반지름.
 * 곡선이 평면 위라 프레임은 (접선, up×접선, up)으로 단순하게 잡는다.
 */
export function taperedTube(points: readonly P3[], radiusAt: (u: number) => number, radial = 8): BufferGeometry {
  const n = points.length;
  const pos: number[] = [];
  const idx: number[] = [];
  const tangent = new Vector3();
  const normal = new Vector3();
  for (let i = 0; i < n; i++) {
    const p = new Vector3(...points[i]);
    const prev = new Vector3(...points[Math.max(0, i - 1)]);
    const next = new Vector3(...points[Math.min(n - 1, i + 1)]);
    tangent.subVectors(next, prev).normalize();
    normal.crossVectors(UP, tangent).normalize();
    const r = radiusAt(i / (n - 1));
    for (let j = 0; j < radial; j++) {
      const a = (j / radial) * Math.PI * 2;
      const c = Math.cos(a) * r;
      const s = Math.sin(a) * r;
      pos.push(p.x + normal.x * c + UP.x * s, p.y + normal.y * c + UP.y * s, p.z + normal.z * c + UP.z * s);
    }
  }
  for (let i = 0; i + 1 < n; i++) {
    for (let j = 0; j < radial; j++) {
      const a = i * radial + j;
      const b = i * radial + ((j + 1) % radial);
      const c = (i + 1) * radial + j;
      const d = (i + 1) * radial + ((j + 1) % radial);
      idx.push(a, c, b, b, c, d);
    }
  }
  // 양끝 캡
  const capCenter = (i: number) => {
    const base = pos.length / 3;
    pos.push(...points[i]);
    const ring = i * radial;
    for (let j = 0; j < radial; j++) {
      const a = ring + j;
      const b = ring + ((j + 1) % radial);
      if (i === 0) idx.push(base, b, a);
      else idx.push(base, a, b);
    }
  };
  capCenter(0);
  capCenter(n - 1);
  const g = new BufferGeometry();
  g.setAttribute('position', new Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  return g;
}

function paint(g: BufferGeometry, hex: string): BufferGeometry {
  const c = new Color(hex);
  const n = g.attributes.position.count;
  const colors = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) colors.set([c.r, c.g, c.b], i * 3);
  g.setAttribute('color', new Float32BufferAttribute(colors, 3));
  return g;
}

/** 당김 p → 활 각 부위의 좌표 (목업 geom()과 동일, 스케일 전) */
export function gakgungPose(p: number) {
  const side = (s: number) =>
    [
      [0, s * 6],
      [16 - 6 * p, s * 9],
      [15 - 8 * p, s * 28],
      [-4 - 12 * p, s * 40],
    ] as const;
  const tip = (s: number): [number, number] => [-14 - 8 * p, s * 53];
  return { side, tip, nock: -14 - 34 * p };
}

/** 활대(검은 칠 + 자작나무 안쪽 선) + 고자 두 쪽을 하나로 병합한 지오메트리. 손잡이·시위·화살은 Bow.tsx가 따로 그린다. */
export function buildGakgungLimbs(p: number, S = BOW_SCALE): BufferGeometry {
  const { side, tip } = gakgungPose(p);
  const parts: BufferGeometry[] = [];
  for (const s of [-1, 1]) {
    const P = side(s);
    const N = 14;
    const limbPts: P3[] = [];
    const stripePts: P3[] = [];
    for (let i = 0; i <= N; i++) {
      const [x, z] = cubic(P, i / N);
      limbPts.push([x * S, 0, z * S]);
      stripePts.push([(x + 1.2) * S, 0.9 * S, z * S]);
    }
    // 반지름: 목업 폭 5.6→3.6 의 절반, 끝으로 갈수록 가늘게
    parts.push(paint(taperedTube(limbPts, (u) => (2.8 - u * u) * S, 8), SCENE_COLORS.bow.limb));
    parts.push(paint(taperedTube(stripePts, () => 0.55 * S, 6), SCENE_COLORS.bow.stripe));
    // 고자 — 활대 끝에서 뒤로 곧게
    const base = P[3];
    const T = tip(s);
    const siyah: P3[] = [
      [base[0] * S, 0, base[1] * S],
      [((base[0] + T[0]) / 2) * S, 0, ((base[1] + T[1]) / 2) * S],
      [T[0] * S, 0, T[1] * S],
    ];
    parts.push(paint(taperedTube(siyah, () => 2.1 * S, 8), SCENE_COLORS.bow.siyah));
  }
  const merged = mergeGeometries(parts, false);
  for (const g of parts) g.dispose();
  if (!merged) throw new Error('bow merge failed');
  merged.computeVertexNormals();
  return merged;
}

/** 시위 양끝(고자 끝)과 오늬 위치 — 스케일 적용 */
export function gakgungString(p: number, S = BOW_SCALE): { top: [number, number]; bottom: [number, number]; nock: number } {
  const { tip, nock } = gakgungPose(p);
  const t = tip(-1);
  const b = tip(1);
  return { top: [t[0] * S, t[1] * S], bottom: [b[0] * S, b[1] * S], nock: nock * S };
}

export const LIMB_KEYFRAMES: readonly BufferGeometry[] = Array.from({ length: KEYFRAMES }, (_, i) => buildGakgungLimbs(i / (KEYFRAMES - 1)));

export const keyframeIndex = (p: number): number => Math.round(Math.min(1, Math.max(0, p)) * (KEYFRAMES - 1));
