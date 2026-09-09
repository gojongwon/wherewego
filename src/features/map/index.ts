import { PACKS } from './packs';

export type { Region, Topology } from './topo';
export { decodeTopo } from './topo';
export {
  fitMercator,
  MAINLAND_EXTENT,
  MAINLAND_CENTER_LON,
  JP_EXTENT,
  JP_ROTATE_DEG,
  type Projection,
  type Box,
  type Extent,
  type FitOptions,
} from './projection';
export { sidoBoundaries } from './boundaries';
export { toScreen, findRegion, pointInRegion, inRing, type ScreenRegion, type Hit } from './region';
export { provinceOf, prettyName, fullName, PROVINCE_BY_CODE, PROVINCE_OVERRIDE } from './names';
export { jpTitle, jpSubtitle } from './names-jp';
export { PACKS, parseMapId, MAP_STORAGE_KEY, type MapId, type MapPack } from './packs';

/** 번들에 포함된 시군구 249개 (울릉군 제외, 설계서 §6.1). 한국 팩 별칭. */
export const REGIONS = PACKS.kr.regions;

/** 시/도 경계 + 해안 폴리라인 (경위도). Terrain이 굵은 선으로 그린다. */
export const SIDO_BOUNDARIES = PACKS.kr.boundaries;
