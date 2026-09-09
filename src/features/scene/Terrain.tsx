import { useEffect, useMemo, useRef } from 'react';
import { invalidate, useFrame, useThree } from '@react-three/fiber';
import { LineBasicMaterial, MeshBasicMaterial, type Mesh, type Shape } from 'three';
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js';
import { LineSegments2 } from 'three/examples/jsm/lines/LineSegments2.js';
import { LineSegmentsGeometry } from 'three/examples/jsm/lines/LineSegmentsGeometry.js';
import type { LonLat } from '@/shared/geo';
import { SCENE } from '@/shared/params';
import type { Projection, Region, ScreenRegion } from '@/features/map';
import { buildTerrain, outlineGeometry, polygonToShape } from './geometry';
import { SCENE_COLORS } from './palette';

const LAND = new MeshBasicMaterial({ vertexColors: true });
/** 시군구 경계 — 가늘고 연하게 (WebGL 선은 1px 고정이라 색으로 위계를 낮춘다) */
const EDGE = new LineBasicMaterial({ color: SCENE_COLORS.landEdge, transparent: true, opacity: 0.9 });
/** 시도 경계 + 해안 — fat line, px 단위 굵기 */
const SIDO_EDGE = new LineMaterial({ color: SCENE_COLORS.sidoEdge, linewidth: SCENE.sidoEdgePx, worldUnits: false, transparent: true, opacity: 0.95 });
/** 외곽선 높이 — 윗면 바로 위 (시도 선이 시군구 선 위에) */
const EDGE_Y = SCENE.depth + 0.2;
const SIDO_Y = SCENE.depth + 0.35;

interface Props {
  regions: readonly Region[];
  screen: readonly ScreenRegion[];
  projection: Projection;
  /** 시도 경계 + 해안 폴리라인 (경위도) */
  boundaries: readonly LonLat[][];
  hitIndex: number | null;
  reduced: boolean;
}

/**
 * 249 시군구 extrude(드로우콜 1, 육지 한 톤) + 시군구 외곽선(1) + 시도·해안 굵은 선(1) + 맞은 시군구 하이라이트.
 * A안 '종이': 색은 결과에만 등장하고, 첫 화면의 구조는 경계선 2단으로 읽힌다.
 */
export function Terrain({ regions, screen, projection, boundaries, hitIndex, reduced }: Props) {
  const shapes = useMemo(
    () => regions.map((r) => r.polygons.map((poly) => polygonToShape(poly.map((ring) => ring.map((ll) => projection.project(ll)))))),
    [regions, projection],
  );
  const land = useMemo(() => buildTerrain(shapes, SCENE.depth, () => SCENE_COLORS.land), [shapes]);
  const edges = useMemo(() => outlineGeometry(screen.flatMap((s) => s.rings), EDGE_Y), [screen]);
  const sido = useMemo(() => {
    const pos: number[] = [];
    for (const line of boundaries) {
      for (let i = 0; i + 1 < line.length; i++) {
        const a = projection.project(line[i]);
        const b = projection.project(line[i + 1]);
        pos.push(a[0], SIDO_Y, a[1], b[0], SIDO_Y, b[1]);
      }
    }
    const g = new LineSegmentsGeometry();
    g.setPositions(pos);
    return new LineSegments2(g, SIDO_EDGE);
  }, [boundaries, projection]);

  // fat line은 화면 해상도를 알아야 px 굵기를 지킨다
  const size = useThree((s) => s.size);
  useEffect(() => {
    SIDO_EDGE.resolution.set(size.width, size.height);
    invalidate();
  }, [size]);

  useEffect(() => () => land.dispose(), [land]);
  useEffect(() => () => edges.dispose(), [edges]);
  useEffect(() => () => sido.geometry.dispose(), [sido]);
  useEffect(() => {
    invalidate();
  }, [land, edges, sido]);

  return (
    <>
      <mesh geometry={land} material={LAND} />
      <lineSegments geometry={edges} material={EDGE} />
      <primitive object={sido} />
      {hitIndex !== null && <HitRegion key={hitIndex} shapes={shapes[hitIndex]} reduced={reduced} />}
    </>
  );
}

const LIFT = SCENE.hitLift;
const LIFT_MS = 250;

/** 맞은 시군구 — 강조색으로 다시 extrude해 0→LIFT 만큼 솟는다 */
function HitRegion({ shapes, reduced }: { shapes: readonly Shape[]; reduced: boolean }) {
  const geometry = useMemo(() => buildTerrain([shapes], SCENE.depth, () => SCENE_COLORS.highlight), [shapes]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  const ref = useRef<Mesh>(null);
  const t0 = useRef<number | null>(null);
  useEffect(() => {
    invalidate();
  }, []);
  useFrame(() => {
    const m = ref.current;
    if (!m) return;
    if (reduced) {
      m.position.y = LIFT;
      return;
    }
    t0.current ??= performance.now();
    const k = Math.min(1, (performance.now() - t0.current) / LIFT_MS);
    m.position.y = LIFT * (1 - Math.pow(1 - k, 3));
    if (k < 1) invalidate();
  });
  return <mesh ref={ref} geometry={geometry} material={LAND} />;
}
