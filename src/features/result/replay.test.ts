import { describe, expect, it } from 'vitest';
import { parseReplayParams } from './replay';

describe('parseReplayParams', () => {
  it('좌표를 읽는다', () => {
    expect(parseReplayParams('?lat=37.75199&lng=128.87612')).toEqual([128.87612, 37.75199]);
  });
  it('없거나 깨진 파라미터는 null', () => {
    expect(parseReplayParams('')).toBeNull();
    expect(parseReplayParams('?lat=abc&lng=1')).toBeNull();
    expect(parseReplayParams('?lat=95&lng=1')).toBeNull();
    expect(parseReplayParams('?lat=37')).toBeNull();
  });
});
