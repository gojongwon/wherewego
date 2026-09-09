import { describe, expect, it } from 'vitest';
import { jpSubtitle, jpTitle } from './names-jp';

describe('jp names', () => {
  it('현 이름과 지방', () => {
    expect(jpTitle({ code: '20', name: '長野県' })).toBe('나가노현');
    expect(jpSubtitle({ code: '20' })).toBe('주부');
    expect(jpTitle({ code: '13', name: '東京都' })).toBe('도쿄도');
    expect(jpSubtitle({ code: '13' })).toBe('간토');
    expect(jpTitle({ code: '01', name: '北海道' })).toBe('홋카이도');
    expect(jpSubtitle({ code: '01' })).toBe('홋카이도');
  });
});
