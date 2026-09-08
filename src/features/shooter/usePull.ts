import { useEffect, useRef, type RefObject } from 'react';
import type { Point } from '@/shared/geo';

export interface PullHandlers {
  /** 지금 당기기를 시작할 수 있는가 (IDLE 상태에서만 true) */
  canStart: () => boolean;
  onStart: () => void;
  onMove: (pull: Point, mag: number) => void;
  onEnd: (pull: Point, mag: number) => void;
}

/**
 * 상대 드래그 당김 입력 (설계서 §5.1).
 * - Pointer Events + setPointerCapture: 손가락이 요소 밖으로 나가도 추적
 * - pull = start − current. 아래로 끌면 pull.y > 0 → 화살은 위로
 * - 핸들러는 ref로 보관해 리스너를 다시 붙이지 않는다
 */
export function usePull(target: RefObject<HTMLElement | null>, handlers: PullHandlers): void {
  const h = useRef(handlers);
  h.current = handlers;

  useEffect(() => {
    const el = target.current;
    if (!el) return;
    let start: Point | null = null;
    let pull: Point = [0, 0];

    const down = (e: PointerEvent) => {
      if (start || !h.current.canStart()) return;
      el.setPointerCapture(e.pointerId);
      start = [e.clientX, e.clientY];
      pull = [0, 0];
      h.current.onStart();
    };
    const move = (e: PointerEvent) => {
      if (!start) return;
      pull = [start[0] - e.clientX, start[1] - e.clientY];
      const mag = Math.hypot(pull[0], pull[1]);
      if (mag < 1) return;
      h.current.onMove(pull, mag);
    };
    const up = () => {
      if (!start) return;
      const mag = Math.hypot(pull[0], pull[1]);
      start = null;
      h.current.onEnd(pull, mag);
    };

    el.addEventListener('pointerdown', down);
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', up);
    return () => {
      el.removeEventListener('pointerdown', down);
      el.removeEventListener('pointermove', move);
      el.removeEventListener('pointerup', up);
      el.removeEventListener('pointercancel', up);
    };
  }, [target]);
}
