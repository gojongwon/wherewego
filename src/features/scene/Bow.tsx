import { useEffect, useMemo, useRef } from 'react';
import { invalidate, useFrame } from '@react-three/fiber';
import {
  BoxGeometry,
  BufferGeometry,
  Float32BufferAttribute,
  type Group,
  LineBasicMaterial,
  type LineSegments,
  MathUtils,
  type Mesh,
  MeshBasicMaterial,
} from 'three';
import type { Point } from '@/shared/geo';
import type { AimState } from '@/features/shooter';
import type { Phase } from '@/app/gameReducer';
import { ARROW_GEOMETRY, ARROW_LENGTH, ARROW_MATERIAL } from './ArrowMesh';
import { BOW_SCALE, LIMB_KEYFRAMES, gakgungString, keyframeIndex } from './bowGeometry';
import { SCENE_COLORS } from './palette';
import { yawOf } from './pose';

/** 활 높이 — 활대 반지름(≈3.8)만큼 띄워 바다 시트에 묻히지 않게 */
const BOW_Y = 4;
const LIMB_MATERIAL = new MeshBasicMaterial({ vertexColors: true });
const STRING_MATERIAL = new LineBasicMaterial({ color: SCENE_COLORS.bow.string, transparent: true, opacity: 0.9 });
const GRIP_MATERIAL = new MeshBasicMaterial({ color: SCENE_COLORS.bow.grip });
const BAND_MATERIAL = new MeshBasicMaterial({ color: SCENE_COLORS.bow.band });
// 줌통(손잡이): 목업 7×18 → 스케일, 높이는 활대보다 조금 두껍게
const GRIP = new BoxGeometry(7 * BOW_SCALE, 7, 18 * BOW_SCALE);
const BAND = new BoxGeometry(7.2 * BOW_SCALE, 7.2, 1.4 * BOW_SCALE);

interface Props {
  anchor: Point;
  aim: AimState;
  phase: Phase;
}

/**
 * 각궁(2번 안) + 시위 + 장전 화살. 매 프레임 AimState를 읽어 회전·당김을 반영한다 (setState 없음).
 * 활대는 당김 키프레임 13개 중 하나로 스왑, 놓으면 댐핑으로 튕겨 돌아온다.
 */
export function Bow({ anchor, aim, phase }: Props) {
  const group = useRef<Group>(null);
  const limbs = useRef<Mesh>(null);
  const string = useRef<LineSegments>(null);
  const nocked = useRef<Mesh>(null);
  const pCur = useRef(0);
  const stringGeom = useMemo(() => {
    const g = new BufferGeometry();
    g.setAttribute('position', new Float32BufferAttribute(new Float32Array(4 * 3), 3));
    return g;
  }, []);
  useEffect(() => () => stringGeom.dispose(), [stringGeom]);
  useEffect(() => {
    invalidate();
  }, [phase, anchor]);

  useFrame((_, dt) => {
    const g = group.current;
    if (!g) return;
    g.rotation.y = yawOf(aim.dir[0], aim.dir[1]);

    // 당김: 조준 중엔 비율을 따라가고, 놓으면 빠르게 0으로 (반동)
    const target = aim.active ? aim.ratio : 0;
    const next = MathUtils.damp(pCur.current, target, aim.active ? 40 : 22, Math.min(dt, 0.05));
    pCur.current = Math.abs(next - target) < 0.004 ? target : next;
    if (pCur.current !== target) invalidate();
    const p = pCur.current;

    if (limbs.current) {
      const geom = LIMB_KEYFRAMES[keyframeIndex(p)];
      if (limbs.current.geometry !== geom) limbs.current.geometry = geom;
    }
    const s = gakgungString(p);
    const pos = stringGeom.attributes.position;
    pos.setXYZ(0, s.top[0], 0, s.top[1]);
    pos.setXYZ(1, s.nock, 0, 0);
    pos.setXYZ(2, s.nock, 0, 0);
    pos.setXYZ(3, s.bottom[0], 0, s.bottom[1]);
    pos.needsUpdate = true;
    if (nocked.current) {
      nocked.current.position.x = s.nock + ARROW_LENGTH;
      nocked.current.visible = phase === 'IDLE' || phase === 'AIMING';
    }
  });

  return (
    <group ref={group} position={[anchor[0], BOW_Y, anchor[1]]}>
      <mesh ref={limbs} geometry={LIMB_KEYFRAMES[0]} material={LIMB_MATERIAL} />
      <mesh geometry={GRIP} material={GRIP_MATERIAL} />
      <mesh geometry={BAND} material={BAND_MATERIAL} position={[0, 0, -4.3 * BOW_SCALE]} />
      <mesh geometry={BAND} material={BAND_MATERIAL} position={[0, 0, 4.3 * BOW_SCALE]} />
      <lineSegments ref={string} geometry={stringGeom} material={STRING_MATERIAL} />
      <mesh ref={nocked} geometry={ARROW_GEOMETRY} material={ARROW_MATERIAL} position={[ARROW_LENGTH, 0.5, 0]} />
    </group>
  );
}
