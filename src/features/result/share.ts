import type { LonLat } from '@/shared/geo';

/** 결과 좌표를 URL에 담는다 — 서버 없이 링크만으로 재현 (설계서 §8) */
export function buildShareUrl(lonLat: LonLat, base: string = location.origin + location.pathname): string {
  const q = new URLSearchParams({ lat: lonLat[1].toFixed(5), lng: lonLat[0].toFixed(5) });
  return `${base}?${q.toString()}`;
}

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

export type ShareOutcome = 'shared' | 'copied' | 'cancelled' | 'failed';

/** Web Share → 클립보드 → 실패 순서로 폴백 */
export async function shareResult(data: { title: string; text: string; url: string }): Promise<ShareOutcome> {
  if (typeof navigator.share === 'function') {
    try {
      await navigator.share(data);
      return 'shared';
    } catch (err) {
      // 사용자가 공유 시트를 닫은 경우: 조용히 종료
      if ((err as { name?: string }).name === 'AbortError') return 'cancelled';
    }
  }
  try {
    await navigator.clipboard.writeText(`${data.text} ${data.url}`);
    return 'copied';
  } catch {
    return 'failed';
  }
}
