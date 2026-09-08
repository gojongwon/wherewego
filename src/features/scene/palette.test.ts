import { describe, expect, it } from 'vitest';
import { PROVINCE_BY_CODE } from '@/features/map';
import { SCENE_COLORS, provinceVariant } from './palette';

/** 육지 경계를 공유하는 시도 쌍 */
const ADJACENT: [string, string][] = [
  ['서울특별시', '경기도'],
  ['서울특별시', '인천광역시'],
  ['경기도', '인천광역시'],
  ['경기도', '강원특별자치도'],
  ['경기도', '충청북도'],
  ['경기도', '충청남도'],
  ['강원특별자치도', '충청북도'],
  ['강원특별자치도', '경상북도'],
  ['충청북도', '충청남도'],
  ['충청북도', '세종특별자치시'],
  ['충청북도', '대전광역시'],
  ['충청북도', '전북특별자치도'],
  ['충청북도', '경상북도'],
  ['충청남도', '세종특별자치시'],
  ['충청남도', '대전광역시'],
  ['충청남도', '전북특별자치도'],
  ['세종특별자치시', '대전광역시'],
  ['전북특별자치도', '전라남도'],
  ['전북특별자치도', '경상남도'],
  ['전북특별자치도', '경상북도'],
  ['전라남도', '광주광역시'],
  ['전라남도', '경상남도'],
  ['경상북도', '대구광역시'],
  ['경상북도', '울산광역시'],
  ['경상북도', '경상남도'],
  ['대구광역시', '경상남도'],
  ['울산광역시', '경상남도'],
  ['울산광역시', '부산광역시'],
  ['경상남도', '부산광역시'],
];

describe('provinceVariant', () => {
  it('모든 시도에 배정이 있고 팔레트 범위 안이다', () => {
    for (const name of Object.values(PROVINCE_BY_CODE)) {
      const v = provinceVariant(name);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(SCENE_COLORS.land.length);
    }
  });
  it('인접 시도는 다른 색', () => {
    for (const [a, b] of ADJACENT) expect(provinceVariant(a), `${a} vs ${b}`).not.toBe(provinceVariant(b));
  });
});
