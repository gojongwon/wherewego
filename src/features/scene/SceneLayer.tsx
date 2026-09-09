import { useState } from 'react';
import { Canvas } from '@react-three/fiber';
import type { LonLat, Point } from '@/shared/geo';
import { SCENE } from '@/shared/params';
import { useReducedMotion } from '@/shared/useReducedMotion';
import type { Projection, Region, ScreenRegion } from '@/features/map';
import type { AimState } from '@/features/shooter';
import type { Phase, Shot } from '@/app/gameReducer';
import { CameraRig } from './CameraRig';
import { Water } from './Water';
import { Terrain } from './Terrain';
import { Bow } from './Bow';
import { AimGuide } from './AimGuide';
import { Flight } from './Flight';

interface Props {
  width: number;
  height: number;
  anchor: Point;
  dMax: number;
  regions: readonly Region[];
  screen: readonly ScreenRegion[];
  projection: Projection;
  /** 시도 경계 + 해안 폴리라인 (경위도) */
  boundaries: readonly LonLat[][];
  /** mutable 조준 상태 — InputLayer가 쓰고 Bow/AimGuide가 프레임마다 읽는다 */
  aim: AimState;
  windNow: () => Point;
  phase: Phase;
  shot: Shot | null;
  hitIndex: number | null;
  shiftY: number;
  /** dev 전용 비행 시간 배율 (연출 검토) */
  slow?: number;
  onFlightEnd: () => void;
}

/**
 * 3D 씬 레이어 (설계서 §4.2). 포인터는 위의 input 레이어가 받는다 (.layer는 pointer-events:none).
 * frameloop="demand": IDLE에서는 프레임을 그리지 않는다. 갱신이 필요한 쪽이 invalidate()를 부른다.
 */
export function SceneLayer(props: Props) {
  const { width, height, anchor, dMax, regions, screen, projection, boundaries, aim, windNow, phase, shot, hitIndex, shiftY, slow = 1, onFlightEnd } = props;
  const [ready, setReady] = useState(false);
  const reduced = useReducedMotion();
  return (
    <div
      className="layer scene-layer"
      data-testid="scene"
      data-ready={ready ? '1' : '0'}
      data-region-count={regions.length}
      aria-hidden="true"
    >
      <Canvas
        orthographic
        camera={{ manual: true, near: 1, far: 4000 }}
        dpr={[1, SCENE.maxDpr]}
        flat
        frameloop="demand"
        gl={{ antialias: true, alpha: true, powerPreference: 'high-performance', stencil: false }}
        onCreated={({ gl }) => {
          gl.domElement.addEventListener('webglcontextlost', (e) => e.preventDefault());
          setReady(true);
        }}
      >
        <CameraRig width={width} height={height} shiftY={shiftY} reduced={reduced} />
        <Water width={width} height={height} />
        <Terrain regions={regions} screen={screen} projection={projection} boundaries={boundaries} hitIndex={hitIndex} reduced={reduced} />
        <Bow anchor={anchor} aim={aim} phase={phase} />
        <AimGuide anchor={anchor} aim={aim} windNow={windNow} />
        <Flight phase={phase} shot={shot} anchor={anchor} dMax={dMax} width={width} reduced={reduced} slow={slow} onFlightEnd={onFlightEnd} />
      </Canvas>
    </div>
  );
}
