import { describe, expect, it } from 'vitest';
import { tokens } from './tokens';

/** WCAG 2.x 상대 휘도 → 대비율. 토큰 값이 바뀌어도 텍스트 AA(4.5) / 그래픽(3.0)을 지키는지 고정한다. */
function luminance(hex: string): number {
  const n = parseInt(hex.slice(1, 7), 16);
  const ch = (v: number) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * ch(n >> 16) + 0.7152 * ch((n >> 8) & 255) + 0.0722 * ch(n & 255);
}
export function contrast(a: string, b: string): number {
  const [l1, l2] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
}

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

  it('육지 외곽선은 모든 파스텔 육지색 위에서 그래픽 기준(3.0) 이상', () => {
    for (const land of Object.values(map.land)) {
      expect(contrast(map['land-edge'], land)).toBeGreaterThanOrEqual(3);
    }
  });

  it('하이라이트는 모든 육지색과 구분된다 (≥ 1.4)', () => {
    for (const land of Object.values(map.land)) {
      expect(contrast(map.highlight, land)).toBeGreaterThanOrEqual(1.4);
    }
  });
});
