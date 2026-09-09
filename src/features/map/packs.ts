import krTopoJson from './data/sgg.topo.json';
import jpTopoJson from './data/jp.topo.json';
import { sidoBoundaries } from './boundaries';
import { prettyName, provinceOf } from './names';
import { jpSubtitle, jpTitle } from './names-jp';
import { JP_EXTENT, JP_ROTATE_DEG, MAINLAND_CENTER_LON, MAINLAND_EXTENT, type Extent } from './projection';
import { decodeTopo, type Region, type Topology } from './topo';
import type { LonLat } from '@/shared/geo';

export type MapId = 'kr' | 'jp';

export interface MapPack {
  id: MapId;
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

export const PACKS: Record<MapId, MapPack> = {
  kr: {
    id: 'kr',
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
    regions: decodeTopo(jpTopo),
    boundaries: sidoBoundaries(jpTopo, { group: (p) => p.code }),
    extent: JP_EXTENT,
    rotateDeg: JP_ROTATE_DEG,
    title: jpTitle,
    subtitle: jpSubtitle,
    sourceLabel: '국토교통성 국토수치정보 · japan-topography',
  },
};

export const MAP_STORAGE_KEY = 'wwg-map';

export function parseMapId(raw: string | null | undefined): MapId | null {
  if (raw === 'kr') return 'kr';
  if (raw === 'jp' || raw === 'jpw' || raw === 'jpe') return 'jp';
  return null;
}
