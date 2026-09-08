export type LonLat = readonly [lon: number, lat: number];
export type Point = readonly [x: number, y: number];

export const D2R = Math.PI / 180;
const EARTH_RADIUS_KM = 6371;

/** 두 경위도 사이의 대원 거리 (km) */
export function haversineKm(a: LonLat, b: LonLat): number {
  const dLat = (b[1] - a[1]) * D2R;
  const dLon = (b[0] - a[0]) * D2R;
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(a[1] * D2R) * Math.cos(b[1] * D2R) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h));
}

export const clamp = (v: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, v));

export const dist = (a: Point, b: Point): number => Math.hypot(a[0] - b[0], a[1] - b[1]);
