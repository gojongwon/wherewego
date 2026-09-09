import { useEffect, useMemo, useRef } from 'react';
import { invalidate, useFrame } from '@react-three/fiber';
import { CircleGeometry, DoubleSide, type InstancedMesh, type Mesh, RingGeometry } from 'three';
import { PARAMS } from '@/shared/params';
import type { Point } from '@/shared/geo';
import type { AimState } from '@/features/shooter';
import { DOT_GEOMETRY, MAX_DOTS, OVERLAY_Y, layoutDots, overlayMaterial } from './dots';
import { SCENE_COLORS } from './palette';

const GAUGE_R = 50;
const GAUGE_SEGMENTS = 64;
const DOT_MATERIAL = overlayMaterial(SCENE_COLORS.arrowAccent, 0.9);
const ACCENT_MATERIAL = overlayMaterial(SCENE_COLORS.arrowAccent, 0.9);
ACCENT_MATERIAL.side = DoubleSide; // 게이지는 x 미러(시계방향)라 양면
const ZONE_FILL = overlayMaterial(SCENE_COLORS.arrowAccent, 0.18);
ZONE_FILL.side = DoubleSide;
const AIM_DISK = new CircleGeometry(1, 48).rotateX(-Math.PI / 2);
const AIM_RING = new RingGeometry(0.9, 1, 48).rotateX(-Math.PI / 2);
const ZONE_R0 = 18;
const ZONE_R1 = 72;

/** 조준선 + 착지 범위(원, 바람 세기) + 파워 게이지. AIMING 중에만 보인다. */
export function AimGuide({
  anchor,
  aim,
  windNow,
}: {
  anchor: Point;
  aim: AimState;
  windNow: () => Point;
}) {
  const dots = useRef<InstancedMesh>(null);
  const disk = useRef<Mesh>(null);
  const ring = useRef<Mesh>(null);
  const gauge = useRef<Mesh>(null);
  const gaugeGeom = useMemo(
    () => new RingGeometry(GAUGE_R - 1.5, GAUGE_R + 1.5, GAUGE_SEGMENTS, 1, Math.PI / 2, Math.PI * 2).rotateX(-Math.PI / 2),
    [],
  );
  useEffect(() => () => gaugeGeom.dispose(), [gaugeGeom]);

  useFrame(() => {
    const on = aim.active && aim.mag >= 1;
    for (const r of [dots.current, disk.current, ring.current, gauge.current]) if (r) r.visible = on;
    if (on && dots.current && disk.current && ring.current) {
      const tip: Point = [anchor[0] + aim.dir[0] * aim.d, anchor[1] + aim.dir[1] * aim.d];
      layoutDots(dots.current, anchor, tip);
      const mag = Math.hypot(...windNow());
      const t = PARAMS.wind.maxPx > 0 ? Math.min(1, mag / PARAMS.wind.maxPx) : 0;
      const r = ZONE_R0 + (ZONE_R1 - ZONE_R0) * t;
      disk.current.position.set(tip[0], OVERLAY_Y, tip[1]);
      ring.current.position.set(tip[0], OVERLAY_Y, tip[1]);
      disk.current.scale.set(r, 1, r);
      ring.current.scale.set(r, 1, r);
      gaugeGeom.setDrawRange(0, Math.floor(aim.ratio * GAUGE_SEGMENTS) * 6);
    }
    if (aim.active) invalidate();
  });

  return (
    <>
      <instancedMesh ref={dots} args={[DOT_GEOMETRY, DOT_MATERIAL, MAX_DOTS]} frustumCulled={false} visible={false} />
      <mesh ref={disk} geometry={AIM_DISK} material={ZONE_FILL} visible={false} />
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
