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
  /** 세로로 남는 공간 처리: center = 위아래 균등, bottom = 남단을 box 하단, top = 북단을 box 상단 */
  align?: 'center' | 'bottom' | 'top';
  /** box 가로 중앙에 놓을 경도. 없으면 extent(또는 bbox) 중앙. 축척은 바꾸지 않고 좌우 위치만 옮긴다 */
  centerLon?: number;
  /** 메르카토르 평면에서 반시계 방향 회전(도). 열도처럼 대각선인 땅을 세로 화면에 맞출 때 */
  rotateDeg?: number;
}

/**
 * 본토+제주 기준 범위 (설계서 §4.3 A안). 백령·가거도는 fit에서 빼고, 흑산·진도는 넣는다.
 * 가로는 서해가 잘리지 않을 만큼, 세로는 북단을 헤더 쪽에 붙인다 (남는 공간은 제주–활).
 */
export const MAINLAND_EXTENT: Extent = { lon: [125.47, 129.38], lat: [33.25, 38.52] };

/**
 * 화면 가로 중앙에 둘 경도. 태안↔울산 시각 중심에 맞춤.
 * extent 중앙(127.425)보다 동쪽 — 흑산을 가운데에 두면 본토가 오른쪽으로 밀려 서해 여백이 커 보인다.
 */
export const MAINLAND_CENTER_LON = 127.68;

/** 오키나와·아마미·북방영토는 fit에서 빼고, 홋카이도~규슈 본토를 맞춘다. */
export const JP_EXTENT: Extent = { lon: [128.35, 145.85], lat: [30.95, 45.55] };
/** 열도를 세로 화면에 가깝게. 북쪽이 약간 왼쪽으로 기운다. */
export const JP_ROTATE_DEG = 17;

const mercY = (lat: number): number => Math.log(Math.tan(Math.PI / 4 + (lat * D2R) / 2));
const invLat = (my: number): number => (2 * Math.atan(Math.exp(my)) - Math.PI / 2) / D2R;

/**
 * Mercator 투영을 box 안에 맞춘다.
 * 화면↔경위도 변환은 반드시 이 두 함수로만 한다 (설계서 §6.2).
 */
export function fitMercator(regions: readonly Region[], box: Box, opts: FitOptions = {}): Projection {
  const rot = ((opts.rotateDeg ?? 0) * Math.PI) / 180;
  const cos = Math.cos(rot);
  const sin = Math.sin(rot);
  const rcx = opts.extent ? ((opts.extent.lon[0] + opts.extent.lon[1]) / 2) * D2R : 0;
  const rcy = opts.extent ? (mercY(opts.extent.lat[0]) + mercY(opts.extent.lat[1])) / 2 : 0;
  const spin = (mx: number, my: number): [number, number] => {
    if (!rot) return [mx, my];
    const x = mx - rcx;
    const y = my - rcy;
    return [rcx + x * cos - y * sin, rcy + x * sin + y * cos];
  };
  const unspin = (mx: number, my: number): [number, number] => {
    if (!rot) return [mx, my];
    const x = mx - rcx;
    const y = my - rcy;
    return [rcx + x * cos + y * sin, rcy - x * sin + y * cos];
  };
  const inExtent = (lon: number, lat: number) =>
    !opts.extent ||
    (lon >= opts.extent.lon[0] && lon <= opts.extent.lon[1] && lat >= opts.extent.lat[0] && lat <= opts.extent.lat[1]);

  let mx0 = Infinity;
  let mx1 = -Infinity;
  let my0 = Infinity;
  let my1 = -Infinity;
  const add = (mx: number, my: number) => {
    if (mx < mx0) mx0 = mx;
    if (mx > mx1) mx1 = mx;
    if (my < my0) my0 = my;
    if (my > my1) my1 = my;
  };

  if (opts.extent && !rot) {
    add(opts.extent.lon[0] * D2R, mercY(opts.extent.lat[0]));
    add(opts.extent.lon[1] * D2R, mercY(opts.extent.lat[1]));
  } else {
    for (const r of regions) {
      for (const ring of r.rings) {
        for (const [lon, lat] of ring) {
          if (!inExtent(lon, lat)) continue;
          const [mx, my] = spin(lon * D2R, mercY(lat));
          add(mx, my);
        }
      }
    }
  }
  const k = Math.min(box.width / (mx1 - mx0), box.height / (my1 - my0));
  const cmx = !rot && opts.centerLon !== undefined ? opts.centerLon * D2R : (mx0 + mx1) / 2;
  const cx = box.x + box.width / 2;
  const cmy = opts.align === 'bottom' ? my0 : opts.align === 'top' ? my1 : (my0 + my1) / 2;
  const cy = opts.align === 'bottom' ? box.y + box.height : opts.align === 'top' ? box.y : box.y + box.height / 2;

  return {
    k,
    project: ([lon, lat]) => {
      const [mx, my] = spin(lon * D2R, mercY(lat));
      return [cx + (mx - cmx) * k, cy - (my - cmy) * k];
    },
    invert: ([x, y]) => {
      const [mx, my] = unspin((x - cx) / k + cmx, (cy - y) / k + cmy);
      return [mx / D2R, invLat(my)];
    },
  };
}
