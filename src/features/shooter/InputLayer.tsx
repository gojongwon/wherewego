import { useEffect, useRef } from 'react';
import type { Point } from '@/shared/geo';
import { PARAMS } from '@/shared/params';
import type { Phase } from '@/app/gameReducer';
import type { AimState } from './aimState';
import { computeShot, pullRatio, pullToRange, type EventKind, type ShotGeometry } from './physics';
import { usePull } from './usePull';

interface Props {
  anchor: Point;
  dMax: number;
  phase: Phase;
  /** mutable — 여기서 쓰고 씬이 읽는다 */
  aim: AimState;
  onAimStart: () => void;
  /** 당김 비율(0..1)과 취소 구간 여부 — 힌트 텍스트용. 정수 %가 바뀔 때만 */
  onAimMove: (ratio: number, inDeadZone: boolean) => void;
  onAimCancel: () => void;
  windNow: () => Point;
  /** dev 전용 사건 강제 */
  forceEvent?: EventKind;
  onFire: (geometry: ShotGeometry) => void;
  /** 조준 상태가 바뀌었으니 씬을 다시 그려라 (frameloop=demand) */
  onFrame: () => void;
}

/** 투명 입력 레이어 (설계서 §4.2 3번). 당김 벡터를 AimState로 흘리고 놓는 순간 착지점을 확정한다. */
export function InputLayer({
  anchor,
  dMax,
  phase,
  aim,
  windNow,
  forceEvent,
  onAimStart,
  onAimMove,
  onAimCancel,
  onFire,
  onFrame,
}: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const lastPercent = useRef(-1);

  const rest = () => {
    aim.active = false;
    aim.dir = [0, -1];
    aim.d = 0;
    aim.mag = 0;
    aim.ratio = 0;
    onFrame();
  };

  // IDLE로 돌아오면 장전 자세
  useEffect(() => {
    if (phase !== 'IDLE') return;
    lastPercent.current = -1;
    rest();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  usePull(ref, {
    canStart: () => phase === 'IDLE',
    onStart: () => {
      aim.active = true;
      onFrame();
      onAimStart();
    },
    onMove: (pull, mag) => {
      aim.dir = [pull[0] / mag, pull[1] / mag];
      aim.mag = mag;
      aim.d = pullToRange(mag, dMax, PARAMS);
      aim.ratio = pullRatio(mag, PARAMS);
      onFrame();
      const percent = mag < PARAMS.deadZone ? -2 : Math.round(aim.ratio * 100);
      if (percent !== lastPercent.current) {
        lastPercent.current = percent;
        onAimMove(aim.ratio, mag < PARAMS.deadZone);
      }
    },
    onEnd: (pull, mag) => {
      if (mag < PARAMS.deadZone) {
        rest();
        onAimCancel();
        return;
      }
      const geometry = computeShot(anchor, pull, dMax, PARAMS, Math.random, windNow(), forceEvent);
      aim.active = false;
      aim.dir = geometry.dir;
      onFrame();
      navigator.vibrate?.(25);
      onFire(geometry);
    },
  });

  return (
    <div
      ref={ref}
      className="input-layer"
      role="application"
      aria-label="지도 위 아무 곳이나 아래로 당겼다 놓으면 화살이 날아갑니다"
      data-testid="input"
    />
  );
}
