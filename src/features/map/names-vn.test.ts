import { describe, expect, it } from 'vitest';
import { vnSubtitle, vnTitle } from './names-vn';

describe('vn names', () => {
  it('성·시 이름과 권역', () => {
    expect(vnTitle({ code: '01', name: 'Hà Nội' })).toBe('하노이');
    expect(vnSubtitle({ code: '01' })).toBe('북부');
    expect(vnTitle({ code: '48', name: 'Đà Nẵng' })).toBe('다낭');
    expect(vnSubtitle({ code: '48' })).toBe('중부');
    expect(vnTitle({ code: '79', name: 'TP. Hồ Chí Minh' })).toBe('호치민');
    expect(vnSubtitle({ code: '79' })).toBe('남부');
    expect(vnTitle({ code: '56', name: 'Khánh Hòa' })).toBe('카인호아');
    expect(vnSubtitle({ code: '68' })).toBe('고원');
    expect(vnTitle({ code: '91', name: 'An Giang' })).toBe('안장');
  });
});
