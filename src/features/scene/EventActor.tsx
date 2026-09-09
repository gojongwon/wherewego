import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import type { Point } from '@/shared/geo';
import type { EventKind, FlightEvent } from '@/features/shooter';
import type { ActorFx, ActorInstance } from './actor';
import { createGullActor } from './actorGull';
import { createGustActor } from './actorGust';
import { createHandActor } from './actorHand';
import { createPlaneActor } from './actorPlane';
import { cameraShake } from './fx';

export function createActor(kind: EventKind): ActorInstance {
  switch (kind) {
    case 'plane':
      return createPlaneActor();
    case 'finger':
      return createHandActor();
    case 'gull':
      return createGullActor();
    case 'gust':
      return createGustActor();
  }
}

interface Props {
  event: FlightEvent;
  Pe: Point;
  heightAtPe: number;
  stageW: number;
  flyRef: { readonly current: { t0: number; T: number } | null };
  /** 화살 스핀 요청 (돌풍) — Flight가 처리 */
  onArrowSpin: (turns: number) => void;
}

/**
 * 비행 중 사건 액터 (종이비행기·손·갈매기·돌풍). 액터는 three 객체로 한 번 만들고 useFrame에서 update만 한다 (setState 없음).
 * 접촉(τ=at) 순간 onImpact — 카메라 흔들림, 파티클, 화살 스핀. Flight가 비행 중에는 매 프레임 invalidate하므로 여기선 안 한다.
 */
export function EventActor({ event, Pe, heightAtPe, stageW, flyRef, onArrowSpin }: Props) {
  const actor = useMemo(() => createActor(event.kind), [event.kind]);
  const hit = useRef(false);
  useEffect(() => {
    hit.current = false;
    actor.reset();
    return () => actor.dispose();
  }, [actor]);
  const fx = useMemo<ActorFx>(
    () => ({ shake: (amp) => cameraShake.kick(amp), arrowSpin: (turns) => onArrowSpin(turns) }),
    [onArrowSpin],
  );

  useFrame((_, dt) => {
    const f = flyRef.current;
    if (!f) return;
    const now = performance.now();
    const tau = Math.min(1, (now - f.t0) / f.T);
    if (!hit.current && tau >= event.at) {
      hit.current = true;
      actor.onImpact(fx, Pe, heightAtPe);
    }
    actor.update({ tau, dt: Math.min(dt, 0.05), time: now / 1000, ev: event, Pe, hPe: heightAtPe, stageW, T: f.T });
  });

  return (
    <>
      <primitive object={actor.group} />
      {actor.extras.map((o, i) => (
        <primitive key={i} object={o} />
      ))}
    </>
  );
}
