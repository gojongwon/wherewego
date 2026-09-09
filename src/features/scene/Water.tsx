import { useEffect, useMemo } from 'react';
import { ExtrudeGeometry, MeshBasicMaterial, Shape } from 'three';
import { SCENE_COLORS } from './palette';

/** 화면 밖으로 넉넉히 — shiftY로 카메라가 올라가도 바다가 끊기지 않게 */
const BLEED = 400;
const THICK = 3;
/** 시트 윗면 높이 — 육지(0..D)보다 살짝 아래 */
const TOP = -0.5;

// ExtrudeGeometry groups: 0 = 윗/아랫면, 1 = 옆면
const SHEET = [new MeshBasicMaterial({ color: SCENE_COLORS.water }), new MeshBasicMaterial({ color: SCENE_COLORS.waterDeep })];

/**
 * 바다 — 스테이지 전체를 덮는 한 장 (A안 '종이': 카드 대신 풀블리드, 격자 없음).
 * 스테이지 CSS 배경도 같은 물색이라 캔버스 밖과 이어진다.
 */
export function Water({ width, height }: { width: number; height: number }) {
  const sheet = useMemo(() => {
    const s = new Shape();
    const x0 = -BLEED;
    const y0 = -(height + BLEED); // shape y = −레이아웃 y
    const x1 = width + BLEED;
    const y1 = BLEED;
    s.moveTo(x0, y0);
    s.lineTo(x1, y0);
    s.lineTo(x1, y1);
    s.lineTo(x0, y1);
    s.closePath();
    const g = new ExtrudeGeometry(s, { depth: THICK, bevelEnabled: false });
    g.rotateX(-Math.PI / 2);
    return g;
  }, [width, height]);

  useEffect(() => () => sheet.dispose(), [sheet]);

  return <mesh geometry={sheet} material={SHEET} position-y={TOP - THICK} />;
}
