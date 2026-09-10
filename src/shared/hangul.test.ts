import { describe, expect, it } from 'vitest';
import { hasBatchim, josa } from './hangul';

describe('josa', () => {
  it('받침 있으면 이, 없으면 가', () => {
    expect(josa('갈매기', '이/가')).toBe('갈매기가');
    expect(josa('돌풍', '이/가')).toBe('돌풍이');
    expect(josa('종이비행기 충돌', '이/가')).toBe('종이비행기 충돌이');
    expect(josa('손가락 튕김', '이/가')).toBe('손가락 튕김이');
  });

  it('빈 문자열은 받침 없음', () => {
    expect(hasBatchim('')).toBe(false);
    expect(josa('', '이/가')).toBe('가');
  });
});
