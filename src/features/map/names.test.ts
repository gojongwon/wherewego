import { describe, expect, it } from 'vitest';
import { fullName, prettyName, provinceOf } from './names';

describe('names', () => {
  it('시도 이름 — 개편 반영', () => {
    expect(provinceOf({ code: '32010', name: '춘천시' })).toBe('강원특별자치도');
    expect(provinceOf({ code: '35010', name: '전주시완산구' })).toBe('전북특별자치도');
    expect(provinceOf({ code: '11010', name: '종로구' })).toBe('서울특별시');
  });

  it('군위군은 대구광역시로 (2023.7 편입)', () => {
    expect(provinceOf({ code: '37310', name: '군위군' })).toBe('대구광역시');
  });

  it('표시명 정리', () => {
    expect(prettyName('수원시장안구')).toBe('수원시 장안구');
    expect(prettyName('세종시')).toBe('세종특별자치시');
    expect(prettyName('강릉시')).toBe('강릉시');
    expect(prettyName('종로구')).toBe('종로구');
  });

  it('전체 이름 — 세종은 중복 없이 한 번만', () => {
    expect(fullName({ code: '29010', name: '세종시' })).toBe('세종특별자치시');
    expect(fullName({ code: '32020', name: '강릉시' })).toBe('강원특별자치도 강릉시');
  });
});
