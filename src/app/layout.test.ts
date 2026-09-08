import { describe, expect, it } from 'vitest';
import { LAYOUT, PARAMS } from '@/shared/params';
import { computeLayout } from './layout';

describe('computeLayout (390×844 모바일 — 지도 우선)', () => {
  const L = computeLayout(390, 844);

  it('compact이고 앵커가 더 아래다', () => {
    expect(L.compact).toBe(true);
    expect(L.anchor[0]).toBe(195);
    expect(L.anchor[1]).toBeGreaterThan(844 - LAYOUT.anchorFromBottom);
  });
  it('지도가 화면의 대부분을 차지한다', () => {
    expect(L.mapBox.y).toBeGreaterThanOrEqual(72);
    expect(L.mapBox.y + L.mapBox.height).toBeLessThanOrEqual(L.anchor[1] - 22);
    expect(L.mapBox.height / L.height).toBeGreaterThan(0.7);
  });
  it('dMax는 앵커→지도 북단 + overshoot', () => {
    expect(L.dMax).toBe(L.anchor[1] - 72 + PARAMS.overshootPx);
    expect(L.dMax).toBeGreaterThan(PARAMS.dMinPx);
  });
});

describe('computeLayout (430×1100 데스크톱)', () => {
  const L = computeLayout(430, 1100);

  it('LAYOUT 상수를 그대로 쓴다', () => {
    expect(L.compact).toBe(false);
    expect(L.anchor).toEqual([215, 1100 - LAYOUT.anchorFromBottom]);
    expect(L.mapBox.y).toBeGreaterThanOrEqual(LAYOUT.mapTop);
    expect(L.mapBox.y + L.mapBox.height).toBeLessThanOrEqual(L.anchor[1] - LAYOUT.mapBottomGap);
  });
});

describe('computeLayout safeTop', () => {
  it('노치만큼 지도 상한을 내린다', () => {
    const a = computeLayout(390, 844, 0);
    const b = computeLayout(390, 844, 47);
    expect(b.mapBox.y).toBeGreaterThan(a.mapBox.y);
    expect(b.mapBox.height).toBeLessThan(a.mapBox.height);
  });
});
