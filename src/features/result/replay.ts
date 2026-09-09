import type { LonLat } from '@/shared/geo';

/** `?lat=..&lng=..` → 경위도. 없거나 깨졌으면 null */
export function parseReplayParams(search: string = location.search): LonLat | null {
  const q = new URLSearchParams(search);
  if (!q.has('lat') || !q.has('lng')) return null;
  const lat = Number(q.get('lat'));
  const lng = Number(q.get('lng'));
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
  return [lng, lat];
}
