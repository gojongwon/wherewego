import { describe, expect, it } from 'vitest';
import { LAYOUT, PARAMS } from '@/shared/params';
import { computeLayout } from './layout';

describe('computeLayout (390×844 기준)', () => {
  const L = computeLayout(390, 844);

  it('앵커는 하단 중앙', () => {
    expect(L.anchor).toEqual([195, 844 - LAYOUT.anchorFromBottom]);
  });
  it('지도 영역은 HUD 아래 ~ 앵커 위', () => {
    expect(L.mapBox.y).toBeGreaterThanOrEqual(LAYOUT.mapTop);
    expect(L.mapBox.y + L.mapBox.height).toBeLessThanOrEqual(L.anchor[1] - LAYOUT.mapBottomGap);
    expect(L.mapBox.width).toBe(390 - LAYOUT.mapPad * 2);
  });
  it('dMax는 앵커→지도 북단 + overshoot', () => {
    expect(L.dMax).toBe(L.anchor[1] - LAYOUT.mapTop + PARAMS.overshootPx);
    expect(L.dMax).toBeGreaterThan(PARAMS.dMinPx);
  });
});
