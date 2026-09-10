import type { Point } from '@/shared/geo';
import { pointInRegion, type ScreenRegion } from '@/features/map';
import { EVENT_KINDS, type ShotGeometry } from '@/features/shooter';

function ringCentroid(ring: readonly Point[]): Point {
  let x = 0;
  let y = 0;
  const n = ring.length;
  if (!n) return [0, 0];
  for (const p of ring) {
    x += p[0];
    y += p[1];
  }
  return [x / n, y / n];
}

export function randomPointInRegion(sr: ScreenRegion, rng: () => number): Point {
  const [minX, minY, maxX, maxY] = sr.bbox;
  const w = maxX - minX;
  const h = maxY - minY;
  if (w > 0 && h > 0) {
    for (let i = 0; i < 80; i++) {
      const p: Point = [minX + rng() * w, minY + rng() * h];
      if (pointInRegion(p, sr)) return p;
    }
  }
  return ringCentroid(sr.rings[0] ?? []);
}

/** 시군구 균등. 면적이 아닌 칸 수가 같다. */
export function pickLuckLanding(screen: readonly ScreenRegion[], rng: () => number): Point {
  if (!screen.length) return [0, 0];
  const i = Math.min(screen.length - 1, Math.floor(rng() * screen.length));
  return randomPointInRegion(screen[i], rng);
}

/**
 * 조준점·바람은 두고, 착지만 아무 칸으로 옮긴다.
 * 사건 킥이 그 차이여서 비행이 조준선을 따라가다 꺾인다.
 */
export function applyLuck(geometry: ShotGeometry, screen: readonly ScreenRegion[], rng: () => number = Math.random): ShotGeometry {
  const landing = pickLuckLanding(screen, rng);
  const kick: Point = [landing[0] - geometry.aim[0] - geometry.wind[0], landing[1] - geometry.aim[1] - geometry.wind[1]];
  const ev = geometry.event;
  const kind = ev?.kind ?? EVENT_KINDS[Math.min(3, Math.floor(rng() * 4))]!;
  const at = ev?.at ?? 0.4 + rng() * 0.12;
  const side = ev?.side ?? (rng() < 0.5 ? -1 : 1);
  return { ...geometry, event: { kind, at, side, kick }, landing };
}
