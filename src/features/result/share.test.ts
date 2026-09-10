import { describe, expect, it } from 'vitest';
import { googleMapUrl, kakaoMapUrl, mapLink, resultSearch, resultUrl } from './share';

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

describe('mapLink', () => {
  it('한국은 카카오, 그 밖은 구글', () => {
    expect(mapLink('kr', [127, 37.5], '강릉시').label).toBe('카카오맵');
    expect(mapLink('kr', [127, 37.5], '강릉시').href).toContain('map.kakao.com');
    expect(mapLink('jp', [139.807, 37.8733], '야마가타현')).toEqual({
      href: googleMapUrl([139.807, 37.8733]),
      label: '구글맵',
    });
    expect(googleMapUrl([139.807, 37.8733])).toBe('https://www.google.com/maps/search/?api=1&query=37.8733,139.807');
  });

  it('카카오 딥링크', () => {
    expect(kakaoMapUrl([139.807, 37.8733], '야마가타현')).toBe(
      'https://map.kakao.com/link/map/%EC%95%BC%EB%A7%88%EA%B0%80%ED%83%80%ED%98%84,37.8733,139.807',
    );
  });
});
