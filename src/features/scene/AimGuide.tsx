import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { DoubleSide, type InstancedMesh, type Mesh, RingGeometry } from 'three';
import type { Point } from '@/shared/geo';
import type { AimState } from '@/features/shooter';
import { DOT_GEOMETRY, MAX_DOTS, OVERLAY_Y, layoutDots, overlayMaterial } from './dots';
import { SCENE_COLORS } from './palette';

const GAUGE_R = 50;
const GAUGE_SEGMENTS = 64;
const DOT_MATERIAL = overlayMaterial(SCENE_COLORS.arrowAccent, 0.9);
const ACCENT_MATERIAL = overlayMaterial(SCENE_COLORS.arrowAccent, 0.9);
ACCENT_MATERIAL.side = DoubleSide; // 게이지는 x 미러(시계방향)라 양면
const AIM_RING = new RingGeometry(6.2, 7.4, 32).rotateX(-Math.PI / 2);

/** 조준선(점선) + 조준점 링 + 파워 게이지(원호). AIMING 중에만 보인다. 전부 depthTest 없는 오버레이. */
export function AimGuide({ anchor, aim }: { anchor: Point; aim: AimState }) {
  const dots = useRef<InstancedMesh>(null);
  const ring = useRef<Mesh>(null);
  const gauge = useRef<Mesh>(null);
  // thetaStart=π/2 → rotateX 후 12시 방향에서 시작. 세그먼트당 인덱스 6개 → setDrawRange로 원호 길이 조절
  const gaugeGeom = useMemo(
    () => new RingGeometry(GAUGE_R - 1.5, GAUGE_R + 1.5, GAUGE_SEGMENTS, 1, Math.PI / 2, Math.PI * 2).rotateX(-Math.PI / 2),
    [],
  );
  useEffect(() => () => gaugeGeom.dispose(), [gaugeGeom]);

  useFrame(() => {
    const on = aim.active && aim.mag >= 1;
    for (const r of [dots.current, ring.current, gauge.current]) if (r) r.visible = on;
    if (!on || !dots.current || !ring.current) return;
    const tip: Point = [anchor[0] + aim.dir[0] * aim.d, anchor[1] + aim.dir[1] * aim.d];
    layoutDots(dots.current, anchor, tip);
    ring.current.position.set(tip[0], OVERLAY_Y, tip[1]);
    gaugeGeom.setDrawRange(0, Math.floor(aim.ratio * GAUGE_SEGMENTS) * 6);
  });

  return (
    <>
      <instancedMesh ref={dots} args={[DOT_GEOMETRY, DOT_MATERIAL, MAX_DOTS]} frustumCulled={false} visible={false} />
      <mesh ref={ring} geometry={AIM_RING} material={ACCENT_MATERIAL} visible={false} />
      <mesh
        ref={gauge}
        geometry={gaugeGeom}
        material={ACCENT_MATERIAL}
        position={[anchor[0], OVERLAY_Y, anchor[1]]}
        scale={[-1, 1, 1]}
        visible={false}
      />
    </>
  );
}
