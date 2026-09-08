import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { invalidate, useFrame } from '@react-three/fiber';
import { CircleGeometry, type InstancedMesh, type Mesh, RingGeometry } from 'three';
import type { Point } from '@/shared/geo';
import { PARAMS, SCENE } from '@/shared/params';
import { easeOut, flightTime, heightAt } from '@/features/shooter';
import type { Phase, Shot } from '@/app/gameReducer';
import { ARROW_GEOMETRY, ARROW_LENGTH, ARROW_MATERIAL, ARROW_SHADOW_MATERIAL } from './ArrowMesh';
import { DOT_GEOMETRY, MAX_DOTS, OVERLAY_Y, layoutDots, overlayMaterial } from './dots';
import { apexHeight, flightPose, yawOf } from './pose';
import { SCENE_COLORS } from './palette';
import { Ribbon, RIBBON_MATERIAL } from './ribbon';
import { EventActor } from './EventActor';

const IMPACT_MS = 700;
const IMPACT_RING = new RingGeometry(0.93, 1, 48).rotateX(-Math.PI / 2); // scale = 반지름
const AIM_GHOST = new RingGeometry(5.5, 6.5, 32).rotateX(-Math.PI / 2);
const MARKER = new CircleGeometry(4, 20).rotateX(-Math.PI / 2);
const AIM_GHOST_MATERIAL = overlayMaterial(SCENE_COLORS.arrowAccent, 0.55);
const MARKER_HIT = overlayMaterial(SCENE_COLORS.impact);
const MARKER_MISS = overlayMaterial(SCENE_COLORS.pinMiss);
const SNAP_MATERIAL = overlayMaterial(SCENE_COLORS.impact, 0.8);
const PIN_PITCH = (PARAMS.pinPitchDeg * Math.PI) / 180;

interface Props {
  phase: Phase;
  shot: Shot | null;
  anchor: Point;
  dMax: number;
  width: number;
  reduced: boolean;
  onFlightEnd: () => void;
}

/**
 * 비행 화살 + 그림자 + 궤적 리본 + 임팩트 링 + 핀(=같은 화살 메시) + 조준점 잔상 + 스냅 점선.
 * 착지점은 이미 확정(설계서 §5.4) — 여기서는 그 지점으로 가는 연출만. 프레임 갱신은 전부 ref.
 */
export function Flight({ phase, shot, anchor, dMax, width, reduced, onFlightEnd }: Props) {
  const arrow = useRef<Mesh>(null);
  const shadow = useRef<Mesh>(null);
  const trail = useRef<Mesh>(null);
  const impact = useRef<Mesh>(null);
  const impactMaterial = useMemo(() => overlayMaterial(SCENE_COLORS.impact, 0.9), []);
  const ribbon = useMemo(() => new Ribbon(), []);
  useEffect(() => () => ribbon.dispose(), [ribbon]);
  const fly = useRef<{ t0: number; T: number; apexH: number; hitEvent: boolean } | null>(null);
  const impactT0 = useRef<number | null>(null);

  // 상태 전환에 따른 1회성 배치. 비행 자체는 useFrame.
  useEffect(() => {
    const a = arrow.current;
    const s = shadow.current;
    const t = trail.current;
    if (!a || !s || !t) return;
    if (!shot) {
      a.visible = s.visible = t.visible = false;
      fly.current = null;
      impactT0.current = null;
      ribbon.reset();
      invalidate();
      return;
    }
    if (phase === 'FLYING') {
      const d = shot.geometry.d;
      const extra = shot.geometry.event ? PARAMS.events.extraMs : 0;
      fly.current = {
        t0: performance.now(),
        T: flightTime(d, dMax, PARAMS) + extra,
        apexH: apexHeight(d, PARAMS.apexRatio),
        hitEvent: false,
      };
      ribbon.reset();
      a.visible = s.visible = true;
      t.visible = !reduced;
      invalidate();
      return;
    }
    if (phase === 'LANDED' || phase === 'RESULT') {
      fly.current = null;
      s.visible = t.visible = false;
      const { landing } = shot.geometry;
      const p = shot.hit ? shot.hit.point : landing;
      const dx = landing[0] - anchor[0];
      const dz = landing[1] - anchor[1];
      a.visible = true;
      a.position.set(p[0], shot.hit ? SCENE.depth + SCENE.hitLift : 0, p[1]);
      a.rotation.set(0, dx === 0 && dz === 0 ? yawOf(shot.geometry.dir[0], shot.geometry.dir[1]) : yawOf(dx, dz), -PIN_PITCH, 'YZX');
      a.scale.setScalar(1);
      if (phase === 'LANDED' && !shot.replay) {
        impactT0.current = reduced ? null : performance.now();
        navigator.vibrate?.([12, 40, 24]);
      }
      invalidate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, shot]);

  useFrame(() => {
    const now = performance.now();
    const f = fly.current;
    if (f && shot && arrow.current && shadow.current) {
      const tau = reduced ? 1 : Math.min(1, (now - f.t0) / f.T);
      const pose = flightPose(tau, anchor, shot.geometry.landing, f.apexH, PIN_PITCH, shot.geometry.event);
      const ev = shot.geometry.event;
      if (ev && !f.hitEvent && tau >= ev.at) {
        f.hitEvent = true;
        navigator.vibrate?.(15);
      }
      const a = arrow.current;
      a.position.set(pose.x, pose.y, pose.z);
      a.rotation.set(0, pose.yaw, pose.pitch, 'YZX');
      const s = 1 + PARAMS.apexScale * pose.h;
      a.scale.setScalar(s);
      const sh = shadow.current;
      sh.position.set(pose.x, OVERLAY_Y, pose.z);
      sh.rotation.set(0, pose.yaw, 0);
      sh.scale.set(s, 0.02, s);
      ARROW_SHADOW_MATERIAL.opacity = SCENE_COLORS.shadowOpacity * (1 - 0.6 * pose.h);
      // 궤적은 샤프트 중간점을 따라간다
      if (!reduced) ribbon.push(pose.x - Math.cos(pose.yaw) * ARROW_LENGTH * 0.5, pose.y, pose.z + Math.sin(pose.yaw) * ARROW_LENGTH * 0.5);
      if (tau >= 1) {
        fly.current = null;
        onFlightEnd();
      } else {
        invalidate();
      }
    }
    const i0 = impactT0.current;
    if (i0 !== null && impact.current && shot) {
      const k = Math.min(1, (now - i0) / IMPACT_MS);
      const r = 6 + 40 * (1 - Math.pow(1 - k, 2));
      impact.current.visible = true;
      impact.current.scale.set(r, 1, r);
      impactMaterial.opacity = 0.9 * (1 - k);
      if (k >= 1) {
        impactT0.current = null;
        impact.current.visible = false;
      } else {
        invalidate();
      }
    }
  });

  const landed = shot !== null && (phase === 'LANDED' || phase === 'RESULT');
  const pin = shot ? (shot.hit ? shot.hit.point : shot.geometry.landing) : null;
  const ev = shot?.geometry.event;
  const pe = ev && shot
    ? (() => {
        const { landing } = shot.geometry;
        const L0: Point = [landing[0] - ev.kick[0], landing[1] - ev.kick[1]];
        const e = easeOut(ev.at);
        return {
          Pe: [anchor[0] + (L0[0] - anchor[0]) * e, anchor[1] + (L0[1] - anchor[1]) * e] as Point,
          h: apexHeight(shot.geometry.d, PARAMS.apexRatio) * heightAt(ev.at),
        };
      })()
    : null;

  return (
    <>
      <mesh ref={arrow} geometry={ARROW_GEOMETRY} material={ARROW_MATERIAL} visible={false} />
      <mesh ref={shadow} geometry={ARROW_GEOMETRY} material={ARROW_SHADOW_MATERIAL} visible={false} />
      <mesh ref={trail} geometry={ribbon.geometry} material={RIBBON_MATERIAL} visible={false} frustumCulled={false} />
      <mesh
        ref={impact}
        geometry={IMPACT_RING}
        material={impactMaterial}
        position={shot ? [shot.geometry.landing[0], OVERLAY_Y, shot.geometry.landing[1]] : [0, 0, 0]}
        visible={false}
      />
      {phase === 'FLYING' && ev && pe && !reduced && (
        <EventActor event={ev} Pe={pe.Pe} heightAtPe={pe.h} stageW={width} flyRef={fly} />
      )}
      {landed && shot && pin && (
        <>
          {!shot.replay && (
            <mesh geometry={AIM_GHOST} material={AIM_GHOST_MATERIAL} position={[shot.geometry.aim[0], OVERLAY_Y, shot.geometry.aim[1]]} />
          )}
          <mesh geometry={MARKER} material={shot.hit ? MARKER_HIT : MARKER_MISS} position={[pin[0], OVERLAY_Y, pin[1]]} />
          {shot.hit?.snapped && <SnapDots a={shot.geometry.landing} b={shot.hit.point} />}
        </>
      )}
    </>
  );
}

/** 바다 착지점 → 스냅된 해안 지점 점선 */
function SnapDots({ a, b }: { a: Point; b: Point }) {
  const ref = useRef<InstancedMesh>(null);
  useLayoutEffect(() => {
    if (!ref.current) return;
    layoutDots(ref.current, a, b, OVERLAY_Y, 6);
    invalidate();
  }, [a, b]);
  return <instancedMesh ref={ref} args={[DOT_GEOMETRY, SNAP_MATERIAL, MAX_DOTS]} frustumCulled={false} />;
}
