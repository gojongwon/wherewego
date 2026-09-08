import { useEffect, useMemo } from 'react';
import { ExtrudeGeometry, MeshBasicMaterial } from 'three';
import type { Box } from '@/features/map';
import { SCENE_COLORS } from './palette';
import { roundedRectShape } from './geometry';

const PAD = 10;
const RADIUS = 16;
const THICK = 3;
/** 시트 윗면 높이 — 육지(0..D)보다 살짝 아래 */
const TOP = -0.5;

// ExtrudeGeometry groups: 0 = 윗/아랫면, 1 = 옆면
const MATERIALS = [new MeshBasicMaterial({ color: SCENE_COLORS.water }), new MeshBasicMaterial({ color: SCENE_COLORS.waterDeep })];

/** 바다 시트 — 지도 영역을 감싼 둥근 종이 한 장 */
export function Water({ box }: { box: Box }) {
  const geometry = useMemo(() => {
    const shape = roundedRectShape(box.x - PAD, -(box.y + box.height + PAD), box.width + PAD * 2, box.height + PAD * 2, RADIUS);
    const g = new ExtrudeGeometry(shape, { depth: THICK, bevelEnabled: false });
    g.rotateX(-Math.PI / 2);
    return g;
  }, [box]);
  useEffect(() => () => geometry.dispose(), [geometry]);

  return <mesh geometry={geometry} material={MATERIALS} position-y={TOP - THICK} />;
}
