import { useEffect, useLayoutEffect, useRef } from 'react';
import { invalidate, useFrame, useThree } from '@react-three/fiber';
import { MathUtils, type OrthographicCamera } from 'three';
import { SCENE } from '@/shared/params';
import { orthoCamera } from './camera';

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

  const apply = (shift: number) => {
    const c = orthoCamera(width, height, SCENE.pitchDeg, shift);
    camera.left = c.left;
    camera.right = c.right;
    camera.top = c.top;
    camera.bottom = c.bottom;
    camera.near = c.near;
    camera.far = c.far;
    camera.position.set(...c.position);
    camera.lookAt(...c.target);
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
    if (cur.current === shiftY) return;
    const next = reduced ? shiftY : MathUtils.damp(cur.current, shiftY, 12, dt);
    cur.current = Math.abs(next - shiftY) < 0.1 ? shiftY : next;
    apply(cur.current);
    if (cur.current !== shiftY) invalidate();
  });

  return null;
}
