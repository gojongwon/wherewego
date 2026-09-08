import { useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { SCENE } from '@/shared/params';
import { useReducedMotion } from '@/shared/useReducedMotion';
import type { Box, Projection, Region, ScreenRegion } from '@/features/map';
import { CameraRig } from './CameraRig';
import { Water } from './Water';
import { Terrain } from './Terrain';

interface Props {
  width: number;
  height: number;
  mapBox: Box;
  regions: readonly Region[];
  screen: readonly ScreenRegion[];
  projection: Projection;
  hitIndex: number | null;
  shiftY: number;
}

/**
 * 3D 씬 레이어 (설계서 §4.2). 포인터는 위의 input 레이어가 받는다 (.layer는 pointer-events:none).
 * frameloop="demand": IDLE에서는 프레임을 그리지 않는다. 갱신이 필요한 쪽이 invalidate()를 부른다.
 */
export function SceneLayer({ width, height, mapBox, regions, screen, projection, hitIndex, shiftY }: Props) {
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
        <Water box={mapBox} projection={projection} />
        <Terrain regions={regions} screen={screen} projection={projection} hitIndex={hitIndex} reduced={reduced} />
      </Canvas>
    </div>
  );
}
