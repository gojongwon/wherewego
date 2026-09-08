import { forwardRef } from 'react';
import { PARAMS } from '@/shared/params';
import { fullName, prettyName, provinceOf, type Region } from '@/features/map';
import type { Shot } from '@/app/gameReducer';
import { kakaoMapUrl } from './deeplink';

interface Props {
  shot: Shot | null;
  regions: readonly Region[];
  open: boolean;
  onAgain: () => void;
  onShare: () => void;
}

/** 결과 바텀시트 (설계서 §4.4). 높이는 App이 ref로 읽어 지도 시프트에 쓴다. */
export const ResultSheet = forwardRef<HTMLElement, Props>(function ResultSheet(
  { shot, regions, open, onAgain, onShare },
  ref,
) {
  const region = shot?.hit ? regions[shot.hit.index] : null;
  const [lon, lat] = shot?.lonLat ?? [0, 0];

  return (
    <section ref={ref} className={open ? 'sheet show' : 'sheet'} aria-live="polite" aria-hidden={!open}>
      <div className="grip" />
      {shot && !region && (
        <>
          <div className="eyebrow">헛발</div>
          <h1 className="place miss">바다에 빠졌어요</h1>
          <div className="prov">해안에서 {PARAMS.snapKm}km 넘게 벗어났어요</div>
          <dl className="meta">
            <dt>착지</dt>
            <dd>
              {lat.toFixed(3)}, {lon.toFixed(3)}
            </dd>
            <dt>바람</dt>
            <dd>조준점에서 {shot.missKm.toFixed(1)}km 빗나감</dd>
          </dl>
        </>
      )}
      {shot && region && (
        <>
          <div className="eyebrow">이번 여행지</div>
          <h1 className="place" data-testid="place">
            {prettyName(region.name)}
          </h1>
          <div className="prov" data-testid="prov">
            {provinceOf(region)}
          </div>
          <dl className="meta">
            <dt>좌표</dt>
            <dd>
              {lat.toFixed(4)}, {lon.toFixed(4)}
            </dd>
            {!shot.replay && (
              <>
                <dt>바람</dt>
                <dd>조준점에서 {shot.missKm.toFixed(1)}km 빗나감</dd>
              </>
            )}
            <dt>코드</dt>
            <dd>{region.code}</dd>
          </dl>
          {shot.hit?.snapped && (
            <p className="note">바다에 떨어졌지만 {shot.hit.snapKm.toFixed(1)}km 옆 해안으로 붙였어요</p>
          )}
        </>
      )}
      <div className="actions">
        <button className="btn primary" type="button" onClick={onAgain} data-testid="again">
          다시 쏘기
        </button>
        {region && shot && (
          <>
            <a className="btn" href={kakaoMapUrl(fullName(region), shot.lonLat)} target="_blank" rel="noopener noreferrer">
              카카오맵
            </a>
            <button className="btn" type="button" onClick={onShare}>
              공유
            </button>
          </>
        )}
      </div>
    </section>
  );
});
