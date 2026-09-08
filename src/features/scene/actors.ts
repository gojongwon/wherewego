import type { Point } from '@/shared/geo';
import type { EventKind, FlightEvent } from '@/features/shooter';
import { yawOf } from './pose';

export const ACTOR_ENTER = 0.35;
export const ACTOR_EXIT = 0.45;

export interface ActorPose {
  x: number;
  y: number;
  z: number;
  yaw: number;
  roll: number;
  flap: number;
  scale: number;
  opacity: number;
}

function easeInOut(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - ((-2 * t + 2) ** 2) / 2;
}

/** 진입 [at−0.35, at] · 퇴장 [at, at+0.45], 그 밖은 null */
export function actorPose(
  kind: EventKind,
  tau: number,
  ev: FlightEvent,
  Pe: Point,
  heightAtPe: number,
  stageW: number,
): ActorPose | null {
  if (tau < ev.at - ACTOR_ENTER || tau > ev.at + ACTOR_EXIT) return null;

  if (kind === 'gust') {
    const rot = tau * 10;
    if (tau <= ev.at) {
      const u = (tau - (ev.at - ACTOR_ENTER)) / ACTOR_ENTER;
      return { x: Pe[0], y: heightAtPe, z: Pe[1], yaw: rot, roll: rot, flap: 0, scale: u, opacity: 1 };
    }
    const u = (tau - ev.at) / ACTOR_EXIT;
    return { x: Pe[0], y: heightAtPe, z: Pe[1], yaw: rot, roll: rot, flap: 0, scale: 1, opacity: 1 - u };
  }

  if (kind === 'finger') {
    const edgeX = ev.side === 1 ? stageW + 40 : -40;
    const yaw = yawOf(Pe[0] - edgeX, 0);
    if (tau <= ev.at) {
      const u = easeInOut((tau - (ev.at - ACTOR_ENTER)) / ACTOR_ENTER);
      return {
        x: edgeX + (Pe[0] - edgeX) * u,
        y: heightAtPe,
        z: Pe[1],
        yaw,
        roll: 0,
        flap: 0,
        scale: 1,
        opacity: 1,
      };
    }
    const u = easeInOut((tau - ev.at) / ACTOR_EXIT);
    return {
      x: Pe[0] + (edgeX - Pe[0]) * u,
      y: heightAtPe,
      z: Pe[1],
      yaw,
      roll: 0,
      flap: 0,
      scale: 1,
      opacity: 1,
    };
  }

  const fromX = ev.side === 1 ? stageW + 80 : -80;
  const toX = ev.side === 1 ? -80 : stageW + 80;
  const north = Pe[1] - 120;
  const south = Pe[1] + 120;
  let x: number;
  let z: number;
  let y = heightAtPe;
  let dx: number;
  let dz: number;
  if (tau <= ev.at) {
    const u = (tau - (ev.at - ACTOR_ENTER)) / ACTOR_ENTER;
    x = fromX + (Pe[0] - fromX) * u;
    z = north + (Pe[1] - north) * u;
    dx = Pe[0] - fromX;
    dz = Pe[1] - north;
  } else {
    const u = (tau - ev.at) / ACTOR_EXIT;
    x = Pe[0] + (toX - Pe[0]) * u;
    z = Pe[1] + (south - Pe[1]) * u;
    y = heightAtPe * (1 - 0.25 * u);
    dx = toX - Pe[0];
    dz = south - Pe[1];
  }
  if (kind === 'gull') y += 5 * Math.sin(tau * 18);
  return {
    x,
    y,
    z,
    yaw: yawOf(dx, dz),
    roll: kind === 'plane' ? 0.2 * Math.sin(tau * 12) : 0,
    flap: kind === 'gull' ? Math.sin(tau * 40) * 0.6 : 0,
    scale: 1,
    opacity: 1,
  };
}
