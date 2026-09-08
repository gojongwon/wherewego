import type { Ref } from 'react';
import { PARAMS } from '@/shared/params';
import { Button, Sheet } from '@/shared/ui';
import { fullName, prettyName, provinceOf, type Region } from '@/features/map';
import type { Shot } from '@/app/gameReducer';
import { kakaoMapUrl } from './deeplink';
import './ResultSheet.css';

interface Props {
  shot: Shot | null;
  regions: readonly Region[];
  open: boolean;
  onAgain: () => void;
  onShare: () => void;
  /** App이 높이를 읽어 지도 시프트에 쓴다 */
  ref?: Ref<HTMLElement>;
}

/** 결과 바텀시트 (설계서 §4.4) */
export function ResultSheet({ shot, regions, open, onAgain, onShare, ref }: Props) {
  const region = shot?.hit ? regions[shot.hit.index] : null;
  const [lon, lat] = shot?.lonLat ?? [0, 0];

  return (
    <Sheet ref={ref} open={open}>
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
            <dt>바람</dt>
            <dd>조준점에서 {shot.missKm.toFixed(1)}km 빗나감</dd>
          </dl>
        </>
      )}
      {shot && region && (
        <>
          <div className="t-eyebrow">이번 여행지</div>
          <h1 className="place t-display" data-testid="place">
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
        <Button variant="primary" onClick={onAgain} data-testid="again">
          다시 쏘기
        </Button>
        {region && shot && (
          <>
            <Button href={kakaoMapUrl(fullName(region), shot.lonLat)}>카카오맵</Button>
            <Button onClick={onShare}>공유</Button>
          </>
        )}
      </div>
    </Sheet>
  );
}
