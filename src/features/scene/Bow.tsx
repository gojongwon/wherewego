import { useEffect, useMemo, useRef } from 'react';
import { invalidate, useFrame } from '@react-three/fiber';
import {
  BufferGeometry,
  Float32BufferAttribute,
  type Group,
  LineBasicMaterial,
  type LineSegments,
  type Mesh,
  MeshBasicMaterial,
  QuadraticBezierCurve3,
  TubeGeometry,
  Vector3,
} from 'three';
import type { Point } from '@/shared/geo';
import type { AimState } from '@/features/shooter';
import type { Phase } from '@/app/gameReducer';
import { ARROW_GEOMETRY, ARROW_LENGTH, ARROW_MATERIAL } from './ArrowMesh';
import { SCENE_COLORS } from './palette';
import { yawOf } from './pose';

/** 활 높이 — 앵커는 시트 밖 "책상" 위 */
const BOW_Y = 0.5;
// SVG 심볼 M-6,-38 Q14,0 -6,38 을 XZ 평면에 그대로
const LIMB = new TubeGeometry(
  new QuadraticBezierCurve3(new Vector3(-6, 0, -38), new Vector3(14, 0, 0), new Vector3(-6, 0, 38)),
  16,
  2,
  6,
  false,
);
const LIMB_MATERIAL = new MeshBasicMaterial({ color: SCENE_COLORS.bow });
const STRING_MATERIAL = new LineBasicMaterial({ color: SCENE_COLORS.arrowInk, transparent: true, opacity: 0.9 });

interface Props {
  anchor: Point;
  aim: AimState;
  phase: Phase;
}

/** 활 + 시위 + 장전 화살. 매 프레임 AimState를 읽어 회전·당김을 반영한다 (setState 없음). */
export function Bow({ anchor, aim, phase }: Props) {
  const group = useRef<Group>(null);
  const string = useRef<LineSegments>(null);
  const nocked = useRef<Mesh>(null);
  const stringGeom = useMemo(() => {
    const g = new BufferGeometry();
    g.setAttribute('position', new Float32BufferAttribute(new Float32Array(4 * 3), 3));
    return g;
  }, []);
  useEffect(() => () => stringGeom.dispose(), [stringGeom]);
  useEffect(() => {
    invalidate();
  }, [phase, anchor]);

  useFrame(() => {
    const g = group.current;
    if (!g) return;
    g.rotation.y = yawOf(aim.dir[0], aim.dir[1]);
    const nock = aim.active ? -Math.min(aim.mag * 0.22, 30) : 0;
    const pos = stringGeom.attributes.position;
    pos.setXYZ(0, -6, 0, -38);
    pos.setXYZ(1, nock, 0, 0);
    pos.setXYZ(2, nock, 0, 0);
    pos.setXYZ(3, -6, 0, 38);
    pos.needsUpdate = true;
    if (nocked.current) {
      nocked.current.position.x = nock + ARROW_LENGTH;
      nocked.current.visible = phase === 'IDLE' || phase === 'AIMING';
    }
  });

  return (
    <group ref={group} position={[anchor[0], BOW_Y, anchor[1]]}>
      <mesh geometry={LIMB} material={LIMB_MATERIAL} />
      <lineSegments ref={string} geometry={stringGeom} material={STRING_MATERIAL} />
      <mesh ref={nocked} geometry={ARROW_GEOMETRY} material={ARROW_MATERIAL} position={[ARROW_LENGTH, 0, 0]} />
    </group>
  );
}
