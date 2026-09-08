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

const mercY = (lat: number): number => Math.log(Math.tan(Math.PI / 4 + (lat * D2R) / 2));
const invLat = (my: number): number => (2 * Math.atan(Math.exp(my)) - Math.PI / 2) / D2R;

/**
 * 모든 링의 bbox를 계산해 box 안에 맞추는 Mercator 투영.
 * 화면↔경위도 변환은 반드시 이 두 함수로만 한다 (설계서 §6.2).
 */
export function fitMercator(regions: readonly Region[], box: Box): Projection {
  let mx0 = Infinity;
  let mx1 = -Infinity;
  let my0 = Infinity;
  let my1 = -Infinity;
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
  const k = Math.min(box.width / (mx1 - mx0), box.height / (my1 - my0));
  const cmx = (mx0 + mx1) / 2;
  const cmy = (my0 + my1) / 2;
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;

  return {
    k,
    project: ([lon, lat]) => [cx + (lon * D2R - cmx) * k, cy - (mercY(lat) - cmy) * k],
    // y 부호 주의: 화면 y는 아래로 증가하므로 (cy − y)
    invert: ([x, y]) => [((x - cx) / k + cmx) / D2R, invLat((cy - y) / k + cmy)],
  };
}
