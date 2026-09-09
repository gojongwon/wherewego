import topoJson from './data/sgg.topo.json';
import { decodeTopo, type Topology } from './topo';
import { sidoBoundaries } from './boundaries';

export type { Region, Topology } from './topo';
export { decodeTopo } from './topo';
export { fitMercator, MAINLAND_EXTENT, type Projection, type Box, type Extent, type FitOptions } from './projection';
export { sidoBoundaries } from './boundaries';
export { toScreen, findRegion, pointInRegion, inRing, type ScreenRegion, type Hit } from './region';
export { provinceOf, prettyName, fullName, PROVINCE_BY_CODE, PROVINCE_OVERRIDE } from './names';

/** 번들에 포함된 시군구 249개 (울릉군 제외, 설계서 §6.1). 모듈 로드 시 1회 디코드. */
export const REGIONS = decodeTopo(topoJson as unknown as Topology);

/** 시/도 경계 + 해안 폴리라인 (경위도). Terrain이 굵은 선으로 그린다. */
export const SIDO_BOUNDARIES = sidoBoundaries(topoJson as unknown as Topology);
