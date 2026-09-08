import { useEffect, useMemo, useRef } from 'react';
import { invalidate, useFrame } from '@react-three/fiber';
import { LineBasicMaterial, MeshBasicMaterial, type Mesh, type Shape } from 'three';
import { SCENE } from '@/shared/params';
import { provinceOf, type Projection, type Region, type ScreenRegion } from '@/features/map';
import { buildTerrain, outlineGeometry, polygonToShape } from './geometry';
import { SCENE_COLORS, provinceVariant } from './palette';

const LAND = new MeshBasicMaterial({ vertexColors: true });
const EDGE = new LineBasicMaterial({ color: SCENE_COLORS.landEdge, transparent: true, opacity: 0.55 });
/** 외곽선 높이 — 윗면 바로 위 */
const EDGE_Y = SCENE.depth + 0.2;

interface Props {
  regions: readonly Region[];
  screen: readonly ScreenRegion[];
  projection: Projection;
  hitIndex: number | null;
  reduced: boolean;
}

/** 249 시군구 extrude(드로우콜 1) + 외곽선(드로우콜 1) + 맞은 시군구 하이라이트 */
export function Terrain({ regions, screen, projection, hitIndex, reduced }: Props) {
  const shapes = useMemo(
    () => regions.map((r) => r.polygons.map((poly) => polygonToShape(poly.map((ring) => ring.map((ll) => projection.project(ll)))))),
    [regions, projection],
  );
  const land = useMemo(
    () => buildTerrain(shapes, SCENE.depth, (i) => SCENE_COLORS.land[provinceVariant(provinceOf(regions[i]))]),
    [shapes, regions],
  );
  const edges = useMemo(() => outlineGeometry(screen.flatMap((s) => s.rings), EDGE_Y), [screen]);
  useEffect(() => () => land.dispose(), [land]);
  useEffect(() => () => edges.dispose(), [edges]);
  useEffect(() => {
    invalidate();
  }, [land, edges]);

  return (
    <>
      <mesh geometry={land} material={LAND} />
      <lineSegments geometry={edges} material={EDGE} />
      {hitIndex !== null && <HitRegion key={hitIndex} shapes={shapes[hitIndex]} reduced={reduced} />}
    </>
  );
}

const LIFT = 4;
const LIFT_MS = 250;

/** 맞은 시군구 — 강조색으로 다시 extrude해 0→LIFT 만큼 솟는다 (.sgg.hit 대체) */
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
