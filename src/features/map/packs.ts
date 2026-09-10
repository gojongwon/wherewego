import krTopoJson from './data/sgg.topo.json';
import jpTopoJson from './data/jp.topo.json';
import twTopoJson from './data/tw.topo.json';
import { sidoBoundaries } from './boundaries';
import { prettyName, provinceOf } from './names';
import { jpSubtitle, jpTitle } from './names-jp';
import { twSubtitle, twTitle } from './names-tw';
import {
  JP_EXTENT,
  JP_ROTATE_DEG,
  MAINLAND_CENTER_LON,
  MAINLAND_EXTENT,
  TW_CENTER_LON,
  TW_EXTENT,
  type Extent,
} from './projection';
import { decodeTopo, type Region, type Topology } from './topo';
import type { LonLat } from '@/shared/geo';

export type MapId = 'kr' | 'jp' | 'tw';

export interface MapPack {
  id: MapId;
  label: string;
  regions: Region[];
  boundaries: LonLat[][];
  extent: Extent;
  centerLon?: number;
  rotateDeg?: number;
  title(region: Region): string;
  subtitle(region: Region): string;
  sourceLabel: string;
}

const krTopo = krTopoJson as unknown as Topology;
const jpTopo = jpTopoJson as unknown as Topology;
const twTopo = twTopoJson as unknown as Topology;

export const PACKS: Record<MapId, MapPack> = {
  kr: {
    id: 'kr',
    label: '한국',
    regions: decodeTopo(krTopo),
    boundaries: sidoBoundaries(krTopo),
    extent: MAINLAND_EXTENT,
    centerLon: MAINLAND_CENTER_LON,
    title: (r) => prettyName(r.name),
    subtitle: (r) => provinceOf(r),
    sourceLabel: '통계청 SGIS(2018) · southkorea-maps',
  },
  jp: {
    id: 'jp',
    label: '일본',
    regions: decodeTopo(jpTopo),
    boundaries: sidoBoundaries(jpTopo, { group: (p) => p.code }),
    extent: JP_EXTENT,
    rotateDeg: JP_ROTATE_DEG,
    title: jpTitle,
    subtitle: jpSubtitle,
    sourceLabel: '국토교통성 국토수치정보 · japan-topography',
  },
  tw: {
    id: 'tw',
    label: '대만',
    regions: decodeTopo(twTopo),
    boundaries: sidoBoundaries(twTopo, { group: (p) => twSubtitle(p) }),
    extent: TW_EXTENT,
    centerLon: TW_CENTER_LON,
    title: twTitle,
    subtitle: twSubtitle,
    sourceLabel: '내정부 鄉鎮市區界 · taiwan-atlas',
  },
};

/** 나라 목록 표시 순서 */
export const MAP_IDS: readonly MapId[] = ['kr', 'jp', 'tw'];

export const MAP_STORAGE_KEY = 'wwg-map';

export function parseMapId(raw: string | null | undefined): MapId | null {
  if (raw === 'kr' || raw === 'jp' || raw === 'tw') return raw;
  if (raw === 'jpw' || raw === 'jpe') return 'jp';
  return null;
}
