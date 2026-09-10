import type { LonLat } from '@/shared/geo';
import type { MapId } from '@/features/map';

/** 결과 재현용 쿼리. 한국은 map을 생략한다. */
export function resultSearch(lonLat: LonLat, mapId: MapId): string {
  const q = new URLSearchParams();
  if (mapId !== 'kr') q.set('map', mapId);
  q.set('lat', lonLat[1].toFixed(5));
  q.set('lng', lonLat[0].toFixed(5));
  return q.toString();
}

export function resultUrl(
  lonLat: LonLat,
  mapId: MapId,
  origin = location.origin,
  path = location.pathname,
): string {
  return `${origin}${path}?${resultSearch(lonLat, mapId)}`;
}
