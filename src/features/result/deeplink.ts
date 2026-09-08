import type { LonLat } from '@/shared/geo';

/** 카카오맵 웹 링크 — 앱이 설치돼 있으면 앱으로 열린다 */
export function kakaoMapUrl(name: string, lonLat: LonLat): string {
  return `https://map.kakao.com/link/map/${encodeURIComponent(name)},${lonLat[1].toFixed(5)},${lonLat[0].toFixed(5)}`;
}
