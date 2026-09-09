import { describe, expect, it } from 'vitest';
import { PACKS, parseMapId } from './packs';

describe('PACKS.jp', () => {
  it('오키나와 없는 도도부현 46', () => {
    expect(PACKS.jp.regions).toHaveLength(46);
    expect(PACKS.jp.regions.some((r) => r.code === '47' || r.name === '沖縄県')).toBe(false);
  });
});

describe('parseMapId', () => {
  it('kr / jp. 옛 서·동 값은 일본 한 장', () => {
    expect(parseMapId('kr')).toBe('kr');
    expect(parseMapId('jp')).toBe('jp');
    expect(parseMapId('jpw')).toBe('jp');
    expect(parseMapId('jpe')).toBe('jp');
    expect(parseMapId('us')).toBeNull();
  });
});
