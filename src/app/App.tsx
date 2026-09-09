import { useCallback, useEffect, useLayoutEffect, useMemo, useReducer, useRef, useState, type CSSProperties } from 'react';
import { LAYOUT, PARAMS } from '@/shared/params';
import { haversineKm } from '@/shared/geo';
import { Toast } from '@/shared/ui';
import { MAINLAND_CENTER_LON, MAINLAND_EXTENT, REGIONS, SIDO_BOUNDARIES, fitMercator, fullName, toScreen } from '@/features/map';
import { InputLayer, createAimState, parseEventParam, parseSlowParam, EVENT_LABEL, type ShotGeometry } from '@/features/shooter';
import { SceneLayer, invalidate } from '@/features/scene';
import { ResultSheet, buildShareUrl, parseReplayParams, shareResult } from '@/features/result';
import { WindGauge, newRound, windAt } from '@/features/wind';
import { gameReducer, initialState, type Hint } from './gameReducer';
import { computeLayout } from './layout';
import { makeShot, replayShot } from './makeShot';

export function App() {
  const stageRef = useRef<HTMLDivElement>(null);
  const sheetRef = useRef<HTMLElement>(null);
  const [state, dispatch] = useReducer(gameReducer, initialState);
  const phaseRef = useRef(state.phase);
  phaseRef.current = state.phase;
  const [round, setRound] = useState(newRound);
  const [forceEvent] = useState(() => (import.meta.env.DEV ? parseEventParam(location.search) : undefined));
  const [slow] = useState(() => (import.meta.env.DEV ? parseSlowParam(location.search) : 1));
  const [infoOpen, setInfoOpen] = useState(false);
  // 조준 상태는 mutable 객체 — InputLayer가 쓰고 씬이 프레임마다 읽는다 (setState 없음, 설계서 §9.3)
  const [aim] = useState(createAimState);

  // ---- 스테이지 크기: IDLE에서만 반영 (연출 중 레이아웃 변경 금지, 설계서 §7)
  const [size, setSize] = useState<{ w: number; h: number; safeTop: number } | null>(null);
  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const measure = () => {
      if (phaseRef.current !== 'IDLE') return;
      const safeTop = parseFloat(getComputedStyle(el).getPropertyValue('--safe-top')) || 0;
      setSize({ w: el.clientWidth, h: el.clientHeight, safeTop });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // ---- 레이아웃 → 투영 → 화면좌표 링 (크기 바뀔 때만)
  const layout = useMemo(() => (size ? computeLayout(size.w, size.h, size.safeTop) : null), [size]);
  // A안: 본토+제주 기준, 북단을 헤더 쪽에. 서해 5도는 화면 밖으로 나가도 됨.
  const projection = useMemo(
    () =>
      layout
        ? fitMercator(REGIONS, layout.mapBox, { extent: MAINLAND_EXTENT, align: 'top', centerLon: MAINLAND_CENTER_LON })
        : null,
    [layout],
  );
  const screen = useMemo(() => (projection ? toScreen(REGIONS, projection) : null), [projection]);

  // ---- 공유 URL 재현: 첫 레이아웃이 잡히면 1회
  const replayed = useRef(false);
  useEffect(() => {
    if (replayed.current || !screen || !projection) return;
    replayed.current = true;
    const lonLat = parseReplayParams();
    if (lonLat) dispatch({ type: 'REPLAY', shot: replayShot(lonLat, screen, projection) });
  }, [screen, projection]);

  // ---- LANDED → RESULT 지연
  useEffect(() => {
    if (state.phase !== 'LANDED') return;
    const t = setTimeout(() => dispatch({ type: 'SHOW_RESULT' }), LAYOUT.resultDelayMs);
    return () => clearTimeout(t);
  }, [state.phase]);

  // ---- 결과 시트가 착지점을 가리면 지도·연출 레이어를 위로
  const [shiftY, setShiftY] = useState(0);
  useLayoutEffect(() => {
    if (state.phase !== 'RESULT' || !state.shot || !layout) {
      setShiftY(0);
      return;
    }
    const sheetH = sheetRef.current?.offsetHeight ?? 0;
    const py = (state.shot.hit ? state.shot.hit.point : state.shot.geometry.landing)[1];
    setShiftY(Math.max(0, py + 36 - (layout.height - sheetH)));
  }, [state.phase, state.shot, layout]);

  // ---- 토스트
  const [toast, setToast] = useState<string | null>(null);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 1800);
    return () => clearTimeout(t);
  }, [toast]);

  const onFire = useCallback(
    (geometry: ShotGeometry) => {
      if (!screen || !projection) return;
      dispatch({ type: 'FIRE', shot: makeShot(geometry, screen, projection) });
    },
    [screen, projection],
  );
  const onAgain = useCallback(() => {
    const resultOpen = (history.state as { wwg?: string } | null)?.wwg === 'result';
    if (resultOpen || location.search) history.replaceState(null, '', location.pathname);
    dispatch({ type: 'RESET' });
    setRound(newRound());
  }, []);

  useEffect(() => {
    if (state.phase !== 'RESULT') return;
    if ((history.state as { wwg?: string } | null)?.wwg !== 'result') history.pushState({ wwg: 'result' }, '');
    const onPop = () => onAgain();
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, [state.phase, onAgain]);
  const onShare = useCallback(async () => {
    const shot = state.shot;
    if (!shot?.hit) return;
    const region = REGIONS[shot.hit.index];
    const url = buildShareUrl(shot.lonLat);
    const ev = shot.geometry.event;
    const text = `이번 여행지는 ${fullName(region)}! 🏹${ev ? ` (${EVENT_LABEL[ev.kind]} 맞고도)` : ''}`;
    const outcome = await shareResult({ title: '우리 어디가', text, url });
    if (outcome === 'copied') setToast('링크를 복사했어요');
    else if (outcome === 'failed') setToast(url);
  }, [state.shot]);

  const hitIndex = state.shot?.hit && state.phase !== 'FLYING' ? state.shot.hit.index : null;
  const kmPerPx = useMemo(() => {
    if (!projection || !layout) return 1;
    const a = layout.anchor;
    return haversineKm(projection.invert(a), projection.invert([a[0] + 100, a[1]])) / 100;
  }, [projection, layout]);
  const windNow = useCallback(
    () => windAt(round.seed, performance.now() - round.t0, PARAMS.wind),
    [round],
  );

  return (
    <div
      className="stage"
      ref={stageRef}
      data-phase={state.phase}
      data-hit={hitIndex !== null ? REGIONS[hitIndex].code : ''}
      data-compact={layout?.compact ? '1' : '0'}
      style={
        layout
          ? ({ '--anchor-x': `${layout.anchor[0]}px`, '--anchor-y': `${layout.anchor[1]}px` } as CSSProperties)
          : undefined
      }
    >
      {layout && projection && screen && (
        <>
          <SceneLayer
            width={layout.width}
            height={layout.height}
            anchor={layout.anchor}
            dMax={layout.dMax}
            regions={REGIONS}
            screen={screen}
            projection={projection}
            boundaries={SIDO_BOUNDARIES}
            aim={aim}
            phase={state.phase}
            shot={state.shot}
            hitIndex={hitIndex}
            shiftY={shiftY}
            slow={slow}
            onFlightEnd={() => dispatch({ type: 'LAND' })}
          />
          <InputLayer
            anchor={layout.anchor}
            dMax={layout.dMax}
            phase={state.phase}
            aim={aim}
            windNow={windNow}
            forceEvent={forceEvent}
            onAimStart={() => dispatch({ type: 'AIM_START' })}
            onAimMove={(ratio, inDeadZone) => dispatch({ type: 'AIM_MOVE', ratio, inDeadZone })}
            onAimCancel={() => dispatch({ type: 'AIM_CANCEL' })}
            onFire={onFire}
            onFrame={invalidate}
          />
        </>
      )}

      <header className="hud">
        <div className="brand">우리 어디가</div>
        <div className="hud-end">
          <WindGauge round={round} kmPerPx={kmPerPx} active={state.phase === 'IDLE' || state.phase === 'AIMING'} />
          <button
            type="button"
            className="info-btn"
            aria-label="정보"
            aria-expanded={infoOpen}
            onClick={() => setInfoOpen((v) => !v)}
          >
            i
          </button>
        </div>
      </header>
      {infoOpen && (
        <div className="info-pop" role="dialog" aria-label="정보">
          <b>우리 어디가</b> v0.1 · Where we go
          <br />
          경계 데이터: 통계청 SGIS(2018) · southkorea-maps · 게임용 단순화
        </div>
      )}

      <p className="hint" data-testid="hint">
        <HintText hint={state.hint} />
      </p>

      <ResultSheet
        ref={sheetRef}
        shot={state.shot}
        regions={REGIONS}
        open={state.phase === 'RESULT'}
        onAgain={onAgain}
        onShare={onShare}
      />
      <Toast message={toast} />
    </div>
  );
}

function HintText({ hint }: { hint: Hint }) {
  switch (hint.kind) {
    case 'idle':
      return (
        <>
          ↓ 아래로 <b>당겼다 놓으면</b> 화살이 날아가요
        </>
      );
    case 'deadzone':
      return <>조금 더 당겨요 · 여기서 놓으면 취소</>;
    case 'aiming':
      return (
        <>
          놓으면 발사 · 세기 <b>{hint.percent}%</b>
        </>
      );
    case 'cancelled':
      return (
        <>
          취소했어요. 다시 <b>아래로 당겨</b> 보세요
        </>
      );
    case 'none':
      return null;
  }
}
