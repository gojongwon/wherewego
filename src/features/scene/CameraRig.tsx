import { useEffect, useLayoutEffect, useRef } from 'react';
import { invalidate, useFrame, useThree } from '@react-three/fiber';
import { MathUtils, type OrthographicCamera } from 'three';
import { SCENE } from '@/shared/params';
import { orthoCamera } from './camera';
import { cameraShake } from './fx';

interface Props {
  width: number;
  height: number;
  /** 결과 시트가 착지점을 가릴 때 화면을 위로 밀 px (MapLayer의 translateY(-shiftY)와 등가) */
  shiftY: number;
  reduced: boolean;
}

/** 카메라 적용 + shiftY 댐핑. frameloop="demand"라 정착할 때까지만 invalidate. */
export function CameraRig({ width, height, shiftY, reduced }: Props) {
  const camera = useThree((s) => s.camera) as OrthographicCamera;
  const cur = useRef(0);

  const apply = (shift: number, jx = 0, jz = 0) => {
    const c = orthoCamera(width, height, SCENE.pitchDeg, shift);
    camera.left = c.left;
    camera.right = c.right;
    camera.top = c.top;
    camera.bottom = c.bottom;
    camera.near = c.near;
    camera.far = c.far;
    // 사건 접촉 흔들림: 지면 평행 지터 (px) — 카메라와 타깃을 같이 옮겨 화면 전체가 흔들린다
    camera.position.set(c.position[0] + jx, c.position[1], c.position[2] + jz);
    camera.lookAt(c.target[0] + jx, c.target[1], c.target[2] + jz);
    camera.updateProjectionMatrix();
  };

  useLayoutEffect(() => {
    apply(cur.current);
    invalidate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [width, height, camera]);

  useEffect(() => {
    invalidate();
  }, [shiftY]);

  useFrame((_, dt) => {
    const shaking = cameraShake.amp > 0 && !reduced;
    if (cur.current === shiftY && !shaking) return;
    const next = reduced ? shiftY : MathUtils.damp(cur.current, shiftY, 12, dt);
    cur.current = Math.abs(next - shiftY) < 0.1 ? shiftY : next;
    const [jx, jz] = shaking ? cameraShake.step(dt) : [0, 0];
    apply(cur.current, jx, jz);
    if (cur.current !== shiftY || cameraShake.amp > 0) invalidate();
    else if (shaking) apply(cur.current); // 흔들림 끝: 정위치로
  });

  return null;
}
