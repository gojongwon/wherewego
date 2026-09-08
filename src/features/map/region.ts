import { haversineKm, type Point } from '@/shared/geo';
import type { Projection } from './projection';
import type { Region } from './topo';

export interface ScreenRegion {
  region: Region;
  rings: Point[][];
  bbox: readonly [minX: number, minY: number, maxX: number, maxY: number];
}

export type Hit =
  | { index: number; snapped: false; point: Point }
  | { index: number; snapped: true; point: Point; landing: Point; snapKm: number };

/** 경위도 링을 화면좌표 링으로. 레이아웃이 바뀔 때 한 번만 호출. */
export function toScreen(regions: readonly Region[], projection: Projection): ScreenRegion[] {
  return regions.map((region) => {
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    const rings = region.rings.map((ring) =>
      ring.map((ll) => {
        const p = projection.project(ll);
        if (p[0] < minX) minX = p[0];
        if (p[0] > maxX) maxX = p[0];
        if (p[1] < minY) minY = p[1];
        if (p[1] > maxY) maxY = p[1];
        return p;
      }),
    );
    return { region, rings, bbox: [minX, minY, maxX, maxY] };
  });
}

/** ray casting — 한 링에 대한 홀짓수 판정 */
export function inRing(pt: Point, ring: readonly Point[]): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if (yi > pt[1] !== yj > pt[1] && pt[0] < ((xj - xi) * (pt[1] - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  return inside;
}

/** 모든 링(외곽+구멍)에 대한 even-odd — 구멍 안이면 밖으로 판정된다 */
export function pointInRegion(pt: Point, sr: ScreenRegion): boolean {
  const [minX, minY, maxX, maxY] = sr.bbox;
  if (pt[0] < minX || pt[0] > maxX || pt[1] < minY || pt[1] > maxY) return false;
  let count = 0;
  for (const ring of sr.rings) if (inRing(pt, ring)) count++;
  return count % 2 === 1;
}

/**
 * 착지점 → 시군구.
 * 1) 육지면 그 시군구
 * 2) 바다면 가장 가까운 정점을 가진 시군구로 스냅 (snapKm 이내)
 * 3) 그 밖이면 null (헛발)
 */
export function findRegion(
  pt: Point,
  screen: readonly ScreenRegion[],
  projection: Projection,
  snapKm: number,
): Hit | null {
  for (let i = 0; i < screen.length; i++) {
    if (pointInRegion(pt, screen[i])) return { index: i, snapped: false, point: pt };
  }
  let bestD2 = Infinity;
  let bestIndex = -1;
  let bestPt: Point | null = null;
  for (let i = 0; i < screen.length; i++) {
    for (const ring of screen[i].rings) {
      for (const p of ring) {
        const dx = p[0] - pt[0];
        const dy = p[1] - pt[1];
        const d2 = dx * dx + dy * dy;
        if (d2 < bestD2) {
          bestD2 = d2;
          bestIndex = i;
          bestPt = p;
        }
      }
    }
  }
  if (bestIndex < 0 || !bestPt) return null;
  const km = haversineKm(projection.invert(pt), projection.invert(bestPt));
  if (km > snapKm) return null;
  return { index: bestIndex, snapped: true, point: bestPt, landing: pt, snapKm: km };
}

/** SVG path d 문자열 (소수 1자리로 반올림해 DOM 크기 절감) */
export function ringsToPath(rings: readonly Point[][]): string {
  return rings
    .map((r) => 'M' + r.map((p) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join('L') + 'Z')
    .join('');
}
