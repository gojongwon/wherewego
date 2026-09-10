import type { Ref } from 'react';
import { PARAMS } from '@/shared/params';
import { Button, Sheet } from '@/shared/ui';
import type { MapId, Region } from '@/features/map';
import { EVENT_LABEL } from '@/features/shooter';
import { josa } from '@/shared/hangul';
import type { Shot } from '@/app/gameReducer';
import type { PlayMode } from '@/app/playMode';
import { mapLink } from './share';
import './ResultSheet.css';

interface Props {
  shot: Shot | null;
  regions: readonly Region[];
  titleOf: (region: Region) => string;
  subtitleOf: (region: Region) => string;
  playMode?: PlayMode;
  mapId: MapId;
  open: boolean;
  onAgain: () => void;
  /** App이 높이를 읽어 지도 시프트에 쓴다 */
  ref?: Ref<HTMLElement>;
}

/** 결과 바텀시트 (설계서 §4.4) */
export function ResultSheet({
  shot,
  regions,
  titleOf,
  subtitleOf,
  playMode = 'aim',
  mapId,
  open,
  onAgain,
  ref,
}: Props) {
  const region = shot?.hit ? regions[shot.hit.index] : null;
  const [lon, lat] = shot?.lonLat ?? [0, 0];
  const place = region ? titleOf(region) : '바다에 빠졌어요';
  const map = shot ? mapLink(mapId, shot.lonLat, place) : null;

  return (
    <Sheet ref={ref} open={open} onClose={onAgain}>
      {shot && !region && (
        <>
          <div className="t-eyebrow">헛발</div>
          <h1 className="place t-display miss">바다에 빠졌어요</h1>
          <div className="prov">해안에서 {PARAMS.snapKm}km 넘게 벗어났어요</div>
          <dl className="meta">
            <dt>착지</dt>
            <dd>
              {lat.toFixed(3)}, {lon.toFixed(3)}
            </dd>
            <ShotStory shot={shot} playMode={playMode} />
          </dl>
        </>
      )}
      {shot && region && (
        <>
          <div className="t-eyebrow">이번 여행지</div>
          <h1 className="place t-display" data-testid="place">
            {titleOf(region)}
          </h1>
          <div className="prov" data-testid="prov">
            {subtitleOf(region)}
          </div>
          <dl className="meta">
            <dt>좌표</dt>
            <dd>
              {lat.toFixed(4)}, {lon.toFixed(4)}
            </dd>
            {!shot.replay && <ShotStory shot={shot} playMode={playMode} />}
            <dt>코드</dt>
            <dd>{region.code}</dd>
          </dl>
          {shot.hit?.snapped && (
            <p className="note">바다에 떨어졌지만 {shot.hit.snapKm.toFixed(1)}km 옆 해안으로 붙였어요</p>
          )}
        </>
      )}
      <div className="actions">
        <Button variant="primary" onClick={onAgain} data-testid="again">
          다시 쏘기
        </Button>
        {map && <Button href={map.href}>{map.label}</Button>}
      </div>
    </Sheet>
  );
}

function ShotStory({ shot, playMode }: { shot: Shot; playMode: PlayMode }) {
  if (playMode === 'luck') {
    const story = shot.geometry.event
      ? `${josa(EVENT_LABEL[shot.geometry.event.kind], '이/가')} 데려갔어요`
      : '조준은 핑계였어요';
    return (
      <>
        <dt>운</dt>
        <dd>{story}</dd>
      </>
    );
  }
  return (
    <>
      <dt>바람</dt>
      <dd>바람에 {shot.driftKm.toFixed(1)}km 밀림</dd>
      {shot.geometry.event && (
        <>
          <dt>사건</dt>
          <dd>
            {EVENT_LABEL[shot.geometry.event.kind]}에 맞아 {shot.kickKm.toFixed(1)}km 튕김
          </dd>
        </>
      )}
    </>
  );
}
