import { useEffect, useRef } from 'react';
import type { Point } from '@/shared/geo';
import { PARAMS } from '@/shared/params';
import type { Hit } from '@/features/map';
import type { Phase, Shot } from '@/app/gameReducer';
import { computeShot, easeOut, flightTime, heightAt, pullRatio, pullToRange, type ShotGeometry } from './physics';
import { usePull } from './usePull';

interface Props {
  anchor: Point;
  dMax: number;
  /** 지도 레이어와 함께 밀어 올릴 px */
  shiftY: number;
  phase: Phase;
  shot: Shot | null;
  onAimStart: () => void;
  /** 당김 비율(0..1)과 취소 구간 여부 — 힌트 텍스트용 */
  onAimMove: (ratio: number, inDeadZone: boolean) => void;
  onAimCancel: () => void;
  onFire: (geometry: ShotGeometry) => void;
  onFlightEnd: () => void;
}

const ARROW_ID = 'arrow-shape';
const GAUGE_R = 50;

/**
 * 연출 + 입력 레이어 — 조준선·게이지·활·비행 화살·궤적·임팩트·핀, 그리고 투명 입력 div.
 * React는 phase 전환만 알고, 프레임/포인터 단위 갱신은 전부 ref로 DOM 속성을 직접 만진다.
 * (rAF·pointermove 안에서 setState를 부르지 않는다 — 설계서 §4.2, §9.3)
 */
export function FxLayer(props: Props) {
  const { anchor, dMax, shiftY, phase, shot, onAimStart, onAimMove, onAimCancel, onFire, onFlightEnd } = props;
  const inputRef = useRef<HTMLDivElement>(null);
  const guideRef = useRef<SVGLineElement>(null);
  const aimDotRef = useRef<SVGCircleElement>(null);
  const gaugeRef = useRef<SVGCircleElement>(null);
  const bowRef = useRef<SVGGElement>(null);
  const bowStringRef = useRef<SVGPathElement>(null);
  const nockedRef = useRef<SVGGElement>(null);
  const flyingRef = useRef<SVGGElement>(null);
  const arrowBodyRef = useRef<SVGGElement>(null);
  const shadowRef = useRef<SVGEllipseElement>(null);
  const trailRef = useRef<SVGPolylineElement>(null);
  const marksRef = useRef<SVGGElement>(null);
  const lastPercent = useRef(-1);

  const drawBow = (dir: Point, pullPx: number) => {
    const ang = (Math.atan2(dir[1], dir[0]) * 180) / Math.PI;
    bowRef.current?.setAttribute('transform', `translate(${anchor[0]},${anchor[1]}) rotate(${ang})`);
    const nock = -Math.min(pullPx * 0.22, 30);
    bowStringRef.current?.setAttribute('d', `M-6,-38 L${nock},0 L-6,38`);
    nockedRef.current?.setAttribute('transform', `translate(${nock},0)`);
  };
  const showAimUI = (on: boolean) => {
    for (const el of [guideRef.current, gaugeRef.current, aimDotRef.current]) {
      el?.setAttribute('opacity', on ? '0.9' : '0');
    }
  };

  // 앵커가 바뀌면(리사이즈) 활을 기본 자세로
  useEffect(() => {
    drawBow([0, -1], 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [anchor]);

  // IDLE로 돌아오면 장전 상태 복구
  useEffect(() => {
    if (phase !== 'IDLE') return;
    drawBow([0, -1], 0);
    if (nockedRef.current) nockedRef.current.style.opacity = '1';
    lastPercent.current = -1;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  usePull(inputRef, {
    canStart: () => phase === 'IDLE',
    onStart: () => {
      showAimUI(true);
      onAimStart();
    },
    onMove: (pull, mag) => {
      const dir: Point = [pull[0] / mag, pull[1] / mag];
      const d = pullToRange(mag, dMax, PARAMS);
      const ratio = pullRatio(mag, PARAMS);
      drawBow(dir, mag);
      const g = guideRef.current;
      if (g) {
        g.setAttribute('x1', String(anchor[0]));
        g.setAttribute('y1', String(anchor[1]));
        g.setAttribute('x2', String(anchor[0] + dir[0] * d));
        g.setAttribute('y2', String(anchor[1] + dir[1] * d));
      }
      aimDotRef.current?.setAttribute('cx', String(anchor[0] + dir[0] * d));
      aimDotRef.current?.setAttribute('cy', String(anchor[1] + dir[1] * d));
      const gg = gaugeRef.current;
      if (gg) {
        const C = 2 * Math.PI * GAUGE_R;
        gg.setAttribute('cx', String(anchor[0]));
        gg.setAttribute('cy', String(anchor[1]));
        gg.setAttribute('stroke-dasharray', `${C * ratio} ${C}`);
        gg.setAttribute('transform', `rotate(-90 ${anchor[0]} ${anchor[1]})`);
      }
      // 힌트 텍스트는 정수 %가 바뀔 때만 React로 올린다
      const percent = mag < PARAMS.deadZone ? -2 : Math.round(ratio * 100);
      if (percent !== lastPercent.current) {
        lastPercent.current = percent;
        onAimMove(ratio, mag < PARAMS.deadZone);
      }
    },
    onEnd: (pull, mag) => {
      showAimUI(false);
      if (mag < PARAMS.deadZone) {
        drawBow([0, -1], 0);
        onAimCancel();
        return;
      }
      const geometry = computeShot(anchor, pull, dMax, PARAMS);
      drawBow(geometry.dir, 0);
      navigator.vibrate?.(25);
      onFire(geometry);
    },
  });

  // FLYING: 착지점은 이미 확정, 여기서는 그 지점으로 가는 연출만 (설계서 §5.4)
  useEffect(() => {
    if (phase !== 'FLYING' || !shot) return;
    const { landing, d } = shot.geometry;
    const T = flightTime(d, dMax, PARAMS);
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const flying = flyingRef.current;
    const body = arrowBodyRef.current;
    const shadow = shadowRef.current;
    const trail = trailRef.current;
    if (nockedRef.current) nockedRef.current.style.opacity = '0';
    if (trail) {
      trail.setAttribute('points', '');
      trail.style.opacity = '0.6';
    }
    flying?.setAttribute('opacity', '1');
    const ang = (Math.atan2(landing[1] - anchor[1], landing[0] - anchor[0]) * 180) / Math.PI;
    const t0 = performance.now();
    let raf = 0;
    const step = (now: number) => {
      let tau = Math.min(1, (now - t0) / T);
      if (reduced) tau = 1;
      const e = easeOut(tau);
      const x = anchor[0] + (landing[0] - anchor[0]) * e;
      const y = anchor[1] + (landing[1] - anchor[1]) * e;
      const h = heightAt(tau);
      const s = 1 + PARAMS.apexScale * h;
      body?.setAttribute('transform', `translate(${x},${y}) rotate(${ang}) scale(${s})`);
      if (shadow) {
        const sx = x + 18 * h;
        const sy = y + 26 * h;
        shadow.setAttribute('cx', String(sx));
        shadow.setAttribute('cy', String(sy));
        shadow.setAttribute('opacity', String(0.28 * (1 - h * 0.6)));
        shadow.setAttribute('transform', `rotate(${ang} ${sx} ${sy})`);
      }
      trail?.setAttribute('points', `${trail.getAttribute('points') ?? ''} ${x.toFixed(1)},${y.toFixed(1)}`);
      if (tau < 1) {
        raf = requestAnimationFrame(step);
      } else {
        flying?.setAttribute('opacity', '0');
        onFlightEnd();
      }
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, shot, anchor, dMax]);

  // LANDED: 임팩트·조준점 잔상·핀·스냅 점선. 공유 URL 재현(replay)도 같은 경로를 탄다.
  useEffect(() => {
    const marks = marksRef.current;
    if (!marks) return;
    if (!shot) {
      marks.replaceChildren();
      if (trailRef.current) {
        trailRef.current.setAttribute('points', '');
        trailRef.current.style.opacity = '0.6';
      }
      return;
    }
    if (phase !== 'LANDED') return;
    marks.replaceChildren();
    const { aim, landing } = shot.geometry;
    if (!shot.replay) {
      marks.appendChild(circle(landing, 6, { class: 'impact' }));
      marks.appendChild(
        circle(aim, 6, { fill: 'none', stroke: 'var(--accent)', 'stroke-width': '1', opacity: '0.55' }),
      );
    }
    marks.appendChild(pin(hitPoint(shot.hit, landing), shot.hit !== null));
    if (shot.hit?.snapped) marks.appendChild(dashedLine(landing, shot.hit.point));
    if (trailRef.current) trailRef.current.style.opacity = '0';
    if (!shot.replay) navigator.vibrate?.([12, 40, 24]);
  }, [phase, shot]);

  return (
    <>
      <svg className="layer fx-layer" aria-hidden="true" style={{ transform: `translateY(${-shiftY}px)` }}>
        <defs>
          <g id={ARROW_ID}>
            <line x1="-58" y1="0" x2="0" y2="0" stroke="var(--ink)" strokeWidth="2.4" strokeLinecap="round" />
            <path d="M0,0 L-12,-5 L-9,0 L-12,5 Z" fill="var(--accent)" />
            <path d="M-58,0 L-66,-6 L-52,-6 Z M-58,0 L-66,6 L-52,6 Z" fill="var(--hit)" />
          </g>
        </defs>
        <line ref={guideRef} stroke="var(--accent)" strokeWidth="1.2" strokeDasharray="3 6" opacity="0" />
        <circle ref={aimDotRef} r="7" fill="none" stroke="var(--accent)" strokeWidth="1.2" opacity="0" />
        <circle
          ref={gaugeRef}
          r={GAUGE_R}
          fill="none"
          stroke="var(--accent)"
          strokeWidth="3"
          strokeLinecap="round"
          opacity="0"
        />
        <polyline ref={trailRef} fill="none" stroke="var(--accent)" strokeWidth="1.5" strokeDasharray="2 5" opacity="0.6" />
        <g ref={bowRef}>
          <path d="M-6,-38 Q14,0 -6,38" fill="none" stroke="var(--land)" strokeWidth="4" strokeLinecap="round" />
          <path ref={bowStringRef} d="M-6,-38 L0,0 L-6,38" fill="none" stroke="var(--ink)" strokeWidth="1.2" opacity="0.9" />
          <g ref={nockedRef}>
            <use href={`#${ARROW_ID}`} transform="translate(58,0)" />
          </g>
        </g>
        <g ref={flyingRef} opacity="0">
          <ellipse ref={shadowRef} rx="26" ry="5" fill="#000" opacity="0.25" />
          <g ref={arrowBodyRef}>
            <use href={`#${ARROW_ID}`} />
          </g>
        </g>
        <g ref={marksRef} />
      </svg>
      <div
        ref={inputRef}
        className="input-layer"
        role="application"
        aria-label="지도 위 아무 곳이나 아래로 당겼다 놓으면 화살이 날아갑니다"
        data-testid="input"
      />
    </>
  );
}

/* ---------- SVG 헬퍼 ---------- */

const SVG_NS = 'http://www.w3.org/2000/svg';

function hitPoint(hit: Hit | null, landing: Point): Point {
  return hit ? hit.point : landing;
}

function circle(p: Point, r: number, attrs: Record<string, string>): SVGCircleElement {
  const c = document.createElementNS(SVG_NS, 'circle');
  c.setAttribute('cx', String(p[0]));
  c.setAttribute('cy', String(p[1]));
  c.setAttribute('r', String(r));
  for (const [k, v] of Object.entries(attrs)) c.setAttribute(k, v);
  return c;
}

function dashedLine(a: Point, b: Point): SVGLineElement {
  const l = document.createElementNS(SVG_NS, 'line');
  l.setAttribute('x1', String(a[0]));
  l.setAttribute('y1', String(a[1]));
  l.setAttribute('x2', String(b[0]));
  l.setAttribute('y2', String(b[1]));
  l.setAttribute('stroke', 'var(--hit)');
  l.setAttribute('stroke-dasharray', '2 4');
  l.setAttribute('stroke-width', '1');
  l.setAttribute('opacity', '0.8');
  return l;
}

/** 꽂힌 화살 + 점 마커 */
function pin(p: Point, ok: boolean): SVGGElement {
  const g = document.createElementNS(SVG_NS, 'g');
  g.setAttribute('transform', `translate(${p[0]},${p[1]})`);
  const use = document.createElementNS(SVG_NS, 'use');
  use.setAttribute('href', `#${ARROW_ID}`);
  use.setAttribute('transform', 'rotate(-62) translate(4,0) scale(.85)');
  g.appendChild(use);
  g.appendChild(
    circle([0, 0], 4, { fill: ok ? 'var(--hit)' : 'var(--dim)', stroke: 'var(--ink)', 'stroke-width': '1.5' }),
  );
  return g;
}
