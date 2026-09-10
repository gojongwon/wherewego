import { describe, expect, it } from 'vitest';
import { PACKS, parseMapId } from './packs';

describe('PACKS.jp', () => {
  it('오키나와 없는 도도부현 46', () => {
    expect(PACKS.jp.regions).toHaveLength(46);
    expect(PACKS.jp.regions.some((r) => r.code === '47' || r.name === '沖縄県')).toBe(false);
  });
});

describe('PACKS.tw', () => {
  it('진먼·롄장 없는 현시 20', () => {
    expect(PACKS.tw.regions).toHaveLength(20);
    expect(PACKS.tw.regions.some((r) => r.name === '金門縣' || r.name === '連江縣' || r.code === '09007' || r.code === '09020')).toBe(
      false,
    );
  });
});

describe('parseMapId', () => {
  it('kr / jp / tw. 옛 서·동 값은 일본', () => {
    expect(parseMapId('kr')).toBe('kr');
    expect(parseMapId('jp')).toBe('jp');
    expect(parseMapId('tw')).toBe('tw');
    expect(parseMapId('jpw')).toBe('jp');
    expect(parseMapId('us')).toBeNull();
  });
});
