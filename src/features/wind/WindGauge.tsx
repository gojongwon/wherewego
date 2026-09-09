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

/** 세기 0..1 → 점 개수 1..3 */
export const windDots = (len: number): number => (len < 0.34 ? 1 : len < 0.67 ? 2 : 3);

/**
 * 바람 칩 — 활 옆에 붙는 작은 표시 (A안). 방향은 화살표 회전, 세기는 점 3개.
 * 정확한 km는 시각적으로 빼고(숫자보다 감각) 보조기술용 텍스트로만 남긴다.
 * active일 때만 rAF로 DOM을 직접 갱신(setState 없음).
 */
export function WindGauge({ round, kmPerPx, active }: Props) {
  const arrow = useRef<SVGSVGElement>(null);
  const dots = useRef<HTMLSpanElement>(null);
  const sr = useRef<HTMLElement>(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    if (!active) return;
    const arr = arrow.current;
    const dd = dots.current;
    const label = sr.current;
    if (!arr || !dd || !label) return;
    let lastDots = -1;
    let lastKm = -1;

    const tick = () => {
      const w = windAt(round.seed, performance.now() - round.t0, PARAMS.wind);
      const mag = Math.hypot(w[0], w[1]);
      const deg = (Math.atan2(w[0], -w[1]) * 180) / Math.PI;
      const len = PARAMS.wind.maxPx > 0 ? mag / PARAMS.wind.maxPx : 0;
      arr.style.transform = `rotate(${deg}deg)`;
      const n = windDots(len);
      if (n !== lastDots) {
        lastDots = n;
        dd.querySelectorAll('i').forEach((el, i) => el.classList.toggle('off', i >= n));
      }
      const km = Math.round(mag * kmPerPx);
      if (km !== lastKm) {
        lastKm = km;
        label.textContent = `바람 ${km}km`;
      }
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
    <div className="wind" data-testid="wind" aria-live="off" data-active={active ? '1' : '0'}>
      <svg ref={arrow} className="wind-arrow" viewBox="0 0 24 24" width="14" height="14" aria-hidden="true">
        <path fill="currentColor" d="M12 2 L17 12 H13.5 V22 H10.5 V12 H7 Z" />
      </svg>
      <span className="wind-label" aria-hidden="true">
        바람
      </span>
      <span ref={dots} className="wind-dots" aria-hidden="true">
        <i />
        <i />
        <i className="off" />
      </span>
      <b ref={sr} className="sr-only">
        바람 0km
      </b>
    </div>
  );
}
