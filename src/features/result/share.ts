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

export function kakaoMapUrl(lonLat: LonLat, name: string): string {
  const [lng, lat] = lonLat;
  return `https://map.kakao.com/link/map/${encodeURIComponent(name)},${lat},${lng}`;
}

export function googleMapUrl(lonLat: LonLat): string {
  const [lng, lat] = lonLat;
  return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
}

/** 한국은 카카오, 그 밖은 구글. */
export function mapLink(mapId: MapId, lonLat: LonLat, name: string): { href: string; label: string } {
  if (mapId === 'kr') return { href: kakaoMapUrl(lonLat, name), label: '카카오맵' };
  return { href: googleMapUrl(lonLat), label: '구글맵' };
}
