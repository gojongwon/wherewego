import { haversineKm, type LonLat, type Point } from '@/shared/geo';
import { PARAMS } from '@/shared/params';
import { findRegion, type Projection, type ScreenRegion } from '@/features/map';
import type { ShotGeometry } from '@/features/shooter';
import type { Shot } from './gameReducer';

let seq = 0;

function offsetKm(projection: Projection, from: Point, delta: Point): number {
  if (delta[0] === 0 && delta[1] === 0) return 0;
  return haversineKm(projection.invert(from), projection.invert([from[0] + delta[0], from[1] + delta[1]]));
}

/** 발사 기하 → 판정까지 끝난 Shot. pointerup 직후 1회 호출. */
export function makeShot(
  geometry: ShotGeometry,
  screen: readonly ScreenRegion[],
  projection: Projection,
  replay = false,
): Shot {
  const hit = findRegion(geometry.landing, screen, projection, PARAMS.snapKm);
  const resultPt: Point = hit ? hit.point : geometry.landing;
  const lonLat: LonLat = projection.invert(resultPt);
  const missKm = haversineKm(projection.invert(geometry.aim), projection.invert(geometry.landing));
  const driftKm = offsetKm(projection, geometry.aim, geometry.drift);
  const kickKm = geometry.event ? offsetKm(projection, geometry.aim, geometry.event.kick) : 0;
  return { id: ++seq, geometry, hit, lonLat, missKm, driftKm, kickKm, replay };
}

/** 공유 URL의 좌표를 "그 자리에 이미 꽂힌" Shot으로 */
export function replayShot(lonLat: LonLat, screen: readonly ScreenRegion[], projection: Projection): Shot {
  const pt = projection.project(lonLat);
  const geometry: ShotGeometry = {
    dir: [0, -1],
    d: 0,
    aim: pt,
    wind: [0, 0],
    drift: [0, 0],
    event: null,
    landing: pt,
  };
  return makeShot(geometry, screen, projection, true);
}
