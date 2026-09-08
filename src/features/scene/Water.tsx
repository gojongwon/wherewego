import { useEffect, useMemo } from 'react';
import { ExtrudeGeometry, LineBasicMaterial, MeshBasicMaterial } from 'three';
import type { Point } from '@/shared/geo';
import type { Box, Projection } from '@/features/map';
import { SCENE_COLORS } from './palette';
import { outlineGeometry, roundedRectShape } from './geometry';

const PAD = 10;
const RADIUS = 16;
const THICK = 3;
/** 시트 윗면 높이 — 육지(0..D)보다 살짝 아래 */
const TOP = -0.5;
const GRID_Y = -0.3;

// ExtrudeGeometry groups: 0 = 윗/아랫면, 1 = 옆면
const SHEET = [new MeshBasicMaterial({ color: SCENE_COLORS.water }), new MeshBasicMaterial({ color: SCENE_COLORS.waterDeep })];
const GRID = new LineBasicMaterial({ color: SCENE_COLORS.grid, transparent: true, opacity: 0.9 });

/** 바다 시트 — 지도 영역을 감싼 둥근 종이 한 장 + 1° 경위도 격자(시트 안으로 클립) */
export function Water({ box, projection }: { box: Box; projection: Projection }) {
  const rect = { x0: box.x - PAD, y0: box.y - PAD, x1: box.x + box.width + PAD, y1: box.y + box.height + PAD };

  const sheet = useMemo(() => {
    const shape = roundedRectShape(rect.x0, -rect.y1, rect.x1 - rect.x0, rect.y1 - rect.y0, RADIUS);
    const g = new ExtrudeGeometry(shape, { depth: THICK, bevelEnabled: false });
    g.rotateX(-Math.PI / 2);
    return g;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [box]);

  const grid = useMemo(() => {
    const lines: Point[][] = [];
    for (let lon = 125; lon <= 130; lon++) {
      const x = projection.project([lon, 36])[0];
      if (x > rect.x0 && x < rect.x1) lines.push([[x, rect.y0], [x, rect.y1]]);
    }
    for (let lat = 33; lat <= 39; lat++) {
      const y = projection.project([127, lat])[1];
      if (y > rect.y0 && y < rect.y1) lines.push([[rect.x0, y], [rect.x1, y]]);
    }
    return outlineGeometry(lines, GRID_Y);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [box, projection]);

  useEffect(() => () => sheet.dispose(), [sheet]);
  useEffect(() => () => grid.dispose(), [grid]);

  return (
    <>
      <mesh geometry={sheet} material={SHEET} position-y={TOP - THICK} />
      <lineSegments geometry={grid} material={GRID} />
    </>
  );
}
