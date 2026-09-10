import { useCallback, useEffect, useLayoutEffect, useMemo, useReducer, useRef, useState, type CSSProperties } from 'react';
import { LAYOUT, PARAMS } from '@/shared/params';
import { haversineKm } from '@/shared/geo';
import { PACKS, MAP_IDS, parseMapId, MAP_STORAGE_KEY, fitMercator, toScreen, type MapId } from '@/features/map';
import { InputLayer, createAimState, parseEventParam, parseSlowParam, type ShotGeometry } from '@/features/shooter';
import { SceneLayer, invalidate } from '@/features/scene';
import { ResultSheet, parseReplayParams } from '@/features/result';
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
  const [menuOpen, setMenuOpen] = useState(false);
  const [mapId, setMapId] = useState<MapId>(() => {
    const fromUrl = parseMapId(new URLSearchParams(location.search).get('map'));
    if (fromUrl) return fromUrl;
    try {
      return parseMapId(localStorage.getItem(MAP_STORAGE_KEY)) ?? 'kr';
    } catch {
      return 'kr';
    }
  });
  const pack = PACKS[mapId];
  useEffect(() => {
    try {
      localStorage.setItem(MAP_STORAGE_KEY, mapId);
    } catch {
      /* private mode */
    }
  }, [mapId]);
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
        ? fitMercator(pack.regions, layout.mapBox, {
            extent: pack.extent,
            align: 'top',
            centerLon: pack.centerLon,
            rotateDeg: pack.rotateDeg,
          })
        : null,
    [layout, pack],
  );
  const screen = useMemo(() => (projection ? toScreen(pack.regions, projection) : null), [projection, pack]);

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

  const onFire = useCallback(
    (geometry: ShotGeometry) => {
      if (!screen || !projection) return;
      dispatch({ type: 'FIRE', shot: makeShot(geometry, screen, projection) });
    },
    [screen, projection],
  );
  const onAgain = useCallback(() => {
    const resultOpen = (history.state as { wwg?: string } | null)?.wwg === 'result';
    if (resultOpen || location.search) {
      const q = new URLSearchParams(location.search);
      q.delete('lat');
      q.delete('lng');
      const qs = q.toString();
      history.replaceState(null, '', location.pathname + (qs ? `?${qs}` : ''));
    }
    dispatch({ type: 'RESET' });
    setRound(newRound());
  }, []);

  const selectMap = useCallback(
    (id: MapId) => {
      setMenuOpen(false);
      if (id === mapId) return;
      setMapId(id);
      const url = new URL(location.href);
      if (id === 'kr') url.searchParams.delete('map');
      else url.searchParams.set('map', id);
      url.searchParams.delete('lat');
      url.searchParams.delete('lng');
      history.replaceState(null, '', url.pathname + url.search);
      dispatch({ type: 'RESET' });
      setRound(newRound());
    },
    [mapId],
  );

  useEffect(() => {
    if (state.phase !== 'RESULT') return;
    if ((history.state as { wwg?: string } | null)?.wwg !== 'result') history.pushState({ wwg: 'result' }, '');
    const onPop = () => onAgain();
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, [state.phase, onAgain]);
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
      data-map={pack.id}
      data-hit={hitIndex !== null ? pack.regions[hitIndex].code : ''}
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
            regions={pack.regions}
            screen={screen}
            projection={projection}
            boundaries={pack.boundaries}
            aim={aim}
            windNow={windNow}
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
        <div className="hud-start">
          <h1 className="brand">우리 어디가</h1>
          <button
            type="button"
            className="map-pick"
            data-testid="map-picker"
            aria-haspopup="listbox"
            aria-expanded={menuOpen}
            aria-label="나라 선택"
            onClick={() => setMenuOpen((v) => !v)}
          >
            {pack.label}
          </button>
        </div>
        <div className="hud-end">
          <WindGauge round={round} kmPerPx={kmPerPx} active={state.phase === 'IDLE' || state.phase === 'AIMING'} />
        </div>
      </header>
      {menuOpen && (
        <>
          <button type="button" className="menu-dismiss" aria-label="닫기" onClick={() => setMenuOpen(false)} />
          <div className="menu-pop" role="listbox" aria-label="나라">
            {MAP_IDS.map((id) => (
              <button
                key={id}
                type="button"
                role="option"
                aria-selected={pack.id === id}
                onClick={() => selectMap(id)}
              >
                {PACKS[id].label}
              </button>
            ))}
            <p className="menu-meta">
              우리 어디가 v0.2
              <br />
              {pack.sourceLabel}
            </p>
          </div>
        </>
      )}

      <p className="hint" data-testid="hint">
        <HintText hint={state.hint} />
      </p>

      <ResultSheet
        ref={sheetRef}
        shot={state.shot}
        regions={pack.regions}
        titleOf={pack.title}
        subtitleOf={pack.subtitle}
        open={state.phase === 'RESULT'}
        onAgain={onAgain}
      />
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
