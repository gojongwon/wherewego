import { D2R, type LonLat, type Point } from '@/shared/geo';
import type { Region } from './topo';

export interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Projection {
  project(p: LonLat): Point;
  invert(p: Point): LonLat;
  /** px per Mercator unit(라디안) — 대략적인 km/px 환산에 사용 */
  k: number;
}

/** 경위도 범위 */
export interface Extent {
  lon: readonly [number, number];
  lat: readonly [number, number];
}

export interface FitOptions {
  /** fit 기준 범위. 없으면 모든 링의 bbox. 범위 밖 지형은 그대로 투영되어 화면 밖으로 나갈 수 있다 */
  extent?: Extent;
  /** 세로로 남는 공간 처리: center = 위아래 균등, bottom = 남단을 box 하단(활 쪽)에 붙임 */
  align?: 'center' | 'bottom';
}

/**
 * 본토+제주 기준 범위 (설계서 §4.3 A안). 서해 5도·가거도 등 먼 섬을 fit에서 빼 한반도를 가운데에 크게 놓는다.
 * 섬 자체는 그대로 그려진다 — 화면 밖으로 나가는 것만 허용.
 */
export const MAINLAND_EXTENT: Extent = { lon: [126.05, 129.65], lat: [33.15, 38.65] };

const mercY = (lat: number): number => Math.log(Math.tan(Math.PI / 4 + (lat * D2R) / 2));
const invLat = (my: number): number => (2 * Math.atan(Math.exp(my)) - Math.PI / 2) / D2R;

/**
 * Mercator 투영을 box 안에 맞춘다.
 * 화면↔경위도 변환은 반드시 이 두 함수로만 한다 (설계서 §6.2).
 */
export function fitMercator(regions: readonly Region[], box: Box, opts: FitOptions = {}): Projection {
  let mx0 = Infinity;
  let mx1 = -Infinity;
  let my0 = Infinity;
  let my1 = -Infinity;
  if (opts.extent) {
    mx0 = opts.extent.lon[0] * D2R;
    mx1 = opts.extent.lon[1] * D2R;
    my0 = mercY(opts.extent.lat[0]);
    my1 = mercY(opts.extent.lat[1]);
  } else {
    for (const r of regions) {
      for (const ring of r.rings) {
        for (const [lon, lat] of ring) {
          const mx = lon * D2R;
          const my = mercY(lat);
          if (mx < mx0) mx0 = mx;
          if (mx > mx1) mx1 = mx;
          if (my < my0) my0 = my;
          if (my > my1) my1 = my;
        }
      }
    }
  }
  const k = Math.min(box.width / (mx1 - mx0), box.height / (my1 - my0));
  const cmx = (mx0 + mx1) / 2;
  const cx = box.x + box.width / 2;
  // 세로 배치: center면 bbox 중심을 box 중심에, bottom이면 남단(my0)을 box 하단에
  const cmy = opts.align === 'bottom' ? my0 : (my0 + my1) / 2;
  const cy = opts.align === 'bottom' ? box.y + box.height : box.y + box.height / 2;

  return {
    k,
    project: ([lon, lat]) => [cx + (lon * D2R - cmx) * k, cy - (mercY(lat) - cmy) * k],
    // y 부호 주의: 화면 y는 아래로 증가하므로 (cy − y)
    invert: ([x, y]) => [((x - cx) / k + cmx) / D2R, invLat((cy - y) / k + cmy)],
  };
}
