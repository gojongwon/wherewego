import topoJson from './data/sgg.topo.json';
import { decodeTopo, type Topology } from './topo';

export type { Region, Topology } from './topo';
export { decodeTopo } from './topo';
export { fitMercator, type Projection, type Box } from './projection';
export { toScreen, findRegion, pointInRegion, inRing, ringsToPath, type ScreenRegion, type Hit } from './region';
export { provinceOf, prettyName, fullName, PROVINCE_BY_CODE, PROVINCE_OVERRIDE } from './names';
export { MapLayer } from './MapLayer';

/** 번들에 포함된 시군구 249개 (울릉군 제외, 설계서 §6.1). 모듈 로드 시 1회 디코드. */
export const REGIONS = decodeTopo(topoJson as unknown as Topology);
