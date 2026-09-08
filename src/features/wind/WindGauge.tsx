import { useEffect, useRef } from 'react';
import { PARAMS } from '@/shared/params';
import { useReducedMotion } from '@/shared/useReducedMotion';
import { windAt, type Round } from './wind';
import './wind.css';

interface Props {
  round: Round;
  kmPerPx: number;
  active: boolean;
}

/** HUD 바람 게이지. active일 때만 rAF로 DOM을 직접 갱신(setState 없음). */
export function WindGauge({ round, kmPerPx, active }: Props) {
  const arrow = useRef<SVGSVGElement>(null);
  const km = useRef<HTMLElement>(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    if (!active) return;
    const arr = arrow.current;
    const label = km.current;
    if (!arr || !label) return;

    const tick = () => {
      const w = windAt(round.seed, performance.now() - round.t0, PARAMS.wind);
      const mag = Math.hypot(w[0], w[1]);
      const deg = (Math.atan2(w[0], -w[1]) * 180) / Math.PI;
      const len = PARAMS.wind.maxPx > 0 ? mag / PARAMS.wind.maxPx : 0;
      arr.style.transform = `rotate(${deg}deg) scaleY(${0.4 + 0.6 * len})`;
      label.textContent = `${Math.round(mag * kmPerPx)}km`;
    };

    tick();
    if (reduced) {
      const id = setInterval(tick, 500);
      return () => clearInterval(id);
    }
    let id = 0;
    const loop = () => {
      tick();
      id = requestAnimationFrame(loop);
    };
    id = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(id);
  }, [round, kmPerPx, active, reduced]);

  return (
    <div className="wind" data-testid="wind" aria-live="off">
      <svg ref={arrow} className="wind-arrow" viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
        <path fill="currentColor" d="M12 2 L16 11 H13 V22 H11 V11 H8 Z" />
      </svg>
      <b ref={km}>0km</b>
      <span>바람</span>
    </div>
  );
}
