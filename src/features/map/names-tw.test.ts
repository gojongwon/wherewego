import { describe, expect, it } from 'vitest';
import { twSubtitle, twTitle } from './names-tw';

describe('tw names', () => {
  it('현시 이름과 권역', () => {
    expect(twTitle({ code: '63000', name: '台北市' })).toBe('타이베이시');
    expect(twSubtitle({ code: '63000' })).toBe('북부');
    expect(twTitle({ code: '64000', name: '高雄市' })).toBe('가오슝시');
    expect(twSubtitle({ code: '64000' })).toBe('남부');
    expect(twTitle({ code: '10016', name: '澎湖縣' })).toBe('펑후현');
    expect(twSubtitle({ code: '10016' })).toBe('제도');
  });
});
