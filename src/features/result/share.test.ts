import { describe, expect, it } from 'vitest';
import { resultSearch, resultUrl } from './share';

describe('resultSearch', () => {
  it('한국은 좌표만, 다른 나라는 map을 붙인다', () => {
    expect(resultSearch([128.87612, 37.7519], 'kr')).toBe('lat=37.75190&lng=128.87612');
    expect(resultSearch([139.807, 37.8733], 'jp')).toBe('map=jp&lat=37.87330&lng=139.80700');
  });
});

describe('resultUrl', () => {
  it('origin·path에 쿼리를 붙인다', () => {
    expect(resultUrl([128.8761, 37.7519], 'kr', 'https://a.test', '/')).toBe(
      'https://a.test/?lat=37.75190&lng=128.87610',
    );
  });
});
