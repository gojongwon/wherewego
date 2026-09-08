import { memo, useMemo } from 'react';
import type { Projection } from './projection';
import { ringsToPath, type ScreenRegion } from './region';

interface Props {
  screen: readonly ScreenRegion[];
  projection: Projection;
  /** 하이라이트할 시군구 인덱스 */
  hitIndex: number | null;
  /** 결과 시트가 착지점을 가릴 때 위로 밀어 올리는 px */
  shiftY: number;
}

/**
 * 지도 레이어 — 249개 path와 1° 격자. 레이아웃(screen)이 바뀔 때만 다시 그린다.
 * 화살 연출은 여기 없다 (FxLayer). 이 SVG는 정적이어야 60fps가 나온다.
 */
export const MapLayer = memo(function MapLayer({ screen, projection, hitIndex, shiftY }: Props) {
  const paths = useMemo(() => screen.map((sr) => ringsToPath(sr.rings)), [screen]);
  const grid = useMemo(() => {
    const lines: { x1: number; y1: number; x2: number; y2: number }[] = [];
    for (let lon = 125; lon <= 130; lon++) {
      const [x1, y1] = projection.project([lon, 33]);
      const [x2, y2] = projection.project([lon, 39]);
      lines.push({ x1, y1, x2, y2 });
    }
    for (let lat = 33; lat <= 39; lat++) {
      const [x1, y1] = projection.project([124, lat]);
      const [x2, y2] = projection.project([131, lat]);
      lines.push({ x1, y1, x2, y2 });
    }
    return lines;
  }, [projection]);

  return (
    <svg className="layer map-layer" aria-hidden="true" style={{ transform: `translateY(${-shiftY}px)` }}>
      <g className="grid">
        {grid.map((l, i) => (
          <line key={i} x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2} />
        ))}
      </g>
      <g>
        {paths.map((d, i) => (
          <path
            key={screen[i].region.code}
            d={d}
            fillRule="evenodd"
            className={i === hitIndex ? 'sgg hit' : 'sgg'}
          />
        ))}
      </g>
    </svg>
  );
});
