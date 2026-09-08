import { describe, expect, it } from 'vitest';
import { buildShareUrl, parseReplayParams } from './share';
import { kakaoMapUrl } from './deeplink';

describe('share url', () => {
  it('좌표를 5자리로 인코딩하고 다시 읽는다', () => {
    const url = buildShareUrl([128.876123, 37.751987], 'https://example.test/');
    expect(url).toBe('https://example.test/?lat=37.75199&lng=128.87612');
    expect(parseReplayParams(new URL(url).search)).toEqual([128.87612, 37.75199]);
  });
  it('없거나 깨진 파라미터는 null', () => {
    expect(parseReplayParams('')).toBeNull();
    expect(parseReplayParams('?lat=abc&lng=1')).toBeNull();
    expect(parseReplayParams('?lat=95&lng=1')).toBeNull();
    expect(parseReplayParams('?lat=37')).toBeNull();
  });
});

describe('kakaoMapUrl', () => {
  it('이름은 인코딩, 좌표는 lat,lng 순서', () => {
    expect(kakaoMapUrl('강원특별자치도 강릉시', [128.8761, 37.7519])).toBe(
      `https://map.kakao.com/link/map/${encodeURIComponent('강원특별자치도 강릉시')},37.75190,128.87610`,
    );
  });
});
