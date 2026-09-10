import { describe, expect, it } from 'vitest';
import { DEFAULT_PLAY_MODE, parsePlayMode } from './playMode';

describe('parsePlayMode', () => {
  it('aim / luck. 기본은 운', () => {
    expect(parsePlayMode('aim')).toBe('aim');
    expect(parsePlayMode('luck')).toBe('luck');
    expect(parsePlayMode('random')).toBeNull();
    expect(DEFAULT_PLAY_MODE).toBe('luck');
  });
});
