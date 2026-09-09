import { describe, expect, it } from 'vitest';
import { tokens } from './tokens';

import { contrast } from './contrast';

const { color, map, button, toast } = tokens;

describe('토큰 대비 (WCAG AA)', () => {
  it.each([
    ['본문/캔버스', color.text.primary, color.bg.canvas],
    ['본문/시트', color.text.primary, color.bg.surface],
    ['보조/캔버스', color.text.secondary, color.bg.canvas],
    ['뮤트/캔버스', color.text.muted, color.bg.canvas],
    ['강조 텍스트/캔버스', color.text.accent, color.bg.canvas],
    ['헛발 텍스트/캔버스', color.text.danger, color.bg.canvas],
    ['primary 버튼 글자/배경', button.primary.text, button.primary.bg],
    ['토스트 글자/배경', toast.text, toast.bg],
  ])('%s ≥ 4.5', (_label, fg, bg) => {
    expect(contrast(fg, bg)).toBeGreaterThanOrEqual(4.5);
  });

  it('시도·해안 경계선은 육지 위에서 그래픽 기준(3.0) 이상, 시군구 선은 그보다 연하다', () => {
    expect(contrast(map['sido-edge'], map.land)).toBeGreaterThanOrEqual(3);
    expect(contrast(map['land-edge'], map.land)).toBeLessThan(contrast(map['sido-edge'], map.land));
    expect(contrast(map['land-edge'], map.land)).toBeGreaterThanOrEqual(1.3);
  });

  it('하이라이트는 육지·바다와 구분된다 (≥ 2)', () => {
    expect(contrast(map.highlight, map.land)).toBeGreaterThanOrEqual(2);
    expect(contrast(map.highlight, map.water)).toBeGreaterThanOrEqual(2);
  });
});
