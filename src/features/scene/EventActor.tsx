import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import {
  BufferGeometry,
  CapsuleGeometry,
  CircleGeometry,
  Color,
  DoubleSide,
  EdgesGeometry,
  Float32BufferAttribute,
  LineBasicMaterial,
  MeshBasicMaterial,
  TorusGeometry,
  type Group,
  type Mesh,
} from 'three';
import type { Point } from '@/shared/geo';
import type { FlightEvent } from '@/features/shooter';
import { actorPose } from './actors';
import { SCENE_COLORS } from './palette';

function paint(g: BufferGeometry, hex: string): BufferGeometry {
  const c = new Color(hex);
  const n = g.attributes.position.count;
  const colors = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) colors.set([c.r, c.g, c.b], i * 3);
  g.setAttribute('color', new Float32BufferAttribute(colors, 3));
  g.deleteAttribute('normal');
  g.deleteAttribute('uv');
  return g;
}

function planeGeo(): BufferGeometry {
  const g = new BufferGeometry();
  g.setAttribute(
    'position',
    new Float32BufferAttribute(
      [
        28, 0, 0, -34, 0, 0, -16, 6, 0, 8, 0, 0, -28, 0, 0, -14, 0, -44, 8, 0, 0, -28, 0, 0, -14, 0, 44,
      ],
      3,
    ),
  );
  return paint(g, SCENE_COLORS.actor.plane);
}

const PLANE_GEO = planeGeo();
const PLANE_EDGES = new EdgesGeometry(PLANE_GEO, 15);
const PLANE_EDGE_MAT = new LineBasicMaterial({ color: SCENE_COLORS.arrowInk });

const FINGER_LEN = 130;
const FINGER_R = 22;
const FINGER_GEO = (() => {
  const g = new CapsuleGeometry(FINGER_R, FINGER_LEN, 4, 8);
  g.rotateZ(-Math.PI / 2);
  g.translate(-(FINGER_LEN / 2 + FINGER_R), 0, 0);
  return paint(g, SCENE_COLORS.actor.finger);
})();
const NAIL_GEO = (() => {
  const g = new CircleGeometry(FINGER_R * 0.7, 12);
  g.rotateY(Math.PI / 2);
  g.translate(-1.2, 0, 0);
  return paint(g, '#f4d0be');
})();

function wingGeo(side: 1 | -1): BufferGeometry {
  const g = new BufferGeometry();
  g.setAttribute(
    'position',
    new Float32BufferAttribute([0, 0, 0, -42, 0, 0, -16, 0, 38 * side], 3),
  );
  return paint(g, SCENE_COLORS.actor.gull);
}
const WING_L = wingGeo(-1);
const WING_R = wingGeo(1);

const GUST_GEOS = [28, 44, 62].map((r) => new TorusGeometry(r, 2.4, 6, 24, Math.PI * 1.2));
const GUST_MAT = new MeshBasicMaterial({
  color: SCENE_COLORS.actor.gust,
  transparent: true,
  opacity: 1,
  side: DoubleSide,
  depthTest: false,
});
const FILLED = new MeshBasicMaterial({ vertexColors: true, side: DoubleSide, depthTest: false });

interface Props {
  event: FlightEvent;
  Pe: Point;
  heightAtPe: number;
  stageW: number;
  flyRef: { readonly current: { t0: number; T: number } | null };
}

/** 비행 중 사건 액터. 자세는 actorPose, 프레임 setState 없음. */
export function EventActor({ event, Pe, heightAtPe, stageW, flyRef }: Props) {
  const group = useRef<Group>(null);
  const wingL = useRef<Mesh>(null);
  const wingR = useRef<Mesh>(null);
  const gustMat = useMemo(() => GUST_MAT.clone(), []);

  useFrame(() => {
    const g = group.current;
    const f = flyRef.current;
    if (!g || !f) return;
    const tau = Math.min(1, (performance.now() - f.t0) / f.T);
    const pose = actorPose(event.kind, tau, event, Pe, heightAtPe, stageW);
    if (!pose) {
      g.visible = false;
      return;
    }
    g.visible = true;
    g.position.set(pose.x, pose.y, pose.z);
    g.rotation.set(0, pose.yaw, pose.roll, 'YZX');
    g.scale.setScalar(pose.scale);
    if (event.kind === 'gull') {
      if (wingL.current) wingL.current.rotation.x = pose.flap;
      if (wingR.current) wingR.current.rotation.x = -pose.flap;
    }
    if (event.kind === 'gust') gustMat.opacity = pose.opacity;
  });

  return (
    <group ref={group} visible={false}>
      {event.kind === 'plane' && (
        <>
          <mesh geometry={PLANE_GEO} material={FILLED} />
          <lineSegments geometry={PLANE_EDGES} material={PLANE_EDGE_MAT} />
        </>
      )}
      {event.kind === 'finger' && (
        <>
          <mesh geometry={FINGER_GEO} material={FILLED} />
          <mesh geometry={NAIL_GEO} material={FILLED} />
        </>
      )}
      {event.kind === 'gull' && (
        <>
          <mesh ref={wingL} geometry={WING_L} material={FILLED} />
          <mesh ref={wingR} geometry={WING_R} material={FILLED} />
        </>
      )}
      {event.kind === 'gust' && GUST_GEOS.map((geo, i) => <mesh key={i} geometry={geo} material={gustMat} rotation={[0.4 * i, 0.7 * i, 0]} />)}
    </group>
  );
}
