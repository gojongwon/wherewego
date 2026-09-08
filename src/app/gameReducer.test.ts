import { describe, expect, it } from 'vitest';
import { gameReducer, initialState, type Shot } from './gameReducer';

const shot: Shot = {
  id: 1,
  geometry: { dir: [0, -1], d: 300, aim: [195, 374], wind: [0, 0], landing: [195, 374] },
  hit: null,
  lonLat: [127, 36],
  missKm: 0,
  replay: false,
};

describe('gameReducer — 설계서 §3 상태 머신', () => {
  it('정상 루프: IDLE → AIMING → FLYING → LANDED → RESULT → IDLE', () => {
    let s = gameReducer(initialState, { type: 'AIM_START' });
    expect(s.phase).toBe('AIMING');
    s = gameReducer(s, { type: 'AIM_MOVE', ratio: 0.62, inDeadZone: false });
    expect(s.hint).toEqual({ kind: 'aiming', percent: 62 });
    s = gameReducer(s, { type: 'FIRE', shot });
    expect(s.phase).toBe('FLYING');
    s = gameReducer(s, { type: 'LAND' });
    expect(s.phase).toBe('LANDED');
    s = gameReducer(s, { type: 'SHOW_RESULT' });
    expect(s.phase).toBe('RESULT');
    s = gameReducer(s, { type: 'RESET' });
    expect(s).toEqual(initialState);
  });

  it('데드존 취소: AIMING → IDLE, 힌트는 cancelled', () => {
    const s = gameReducer(gameReducer(initialState, { type: 'AIM_START' }), { type: 'AIM_CANCEL' });
    expect(s.phase).toBe('IDLE');
    expect(s.hint.kind).toBe('cancelled');
  });

  it('FLYING/LANDED 중 입력은 무시된다', () => {
    const flying = gameReducer(gameReducer(initialState, { type: 'AIM_START' }), { type: 'FIRE', shot });
    expect(gameReducer(flying, { type: 'AIM_START' })).toBe(flying);
    expect(gameReducer(flying, { type: 'FIRE', shot })).toBe(flying);
    const landed = gameReducer(flying, { type: 'LAND' });
    expect(gameReducer(landed, { type: 'AIM_START' })).toBe(landed);
  });

  it('REPLAY는 IDLE에서만, 비행 없이 LANDED로', () => {
    const s = gameReducer(initialState, { type: 'REPLAY', shot: { ...shot, replay: true } });
    expect(s.phase).toBe('LANDED');
    expect(gameReducer(s, { type: 'REPLAY', shot })).toBe(s);
  });
});
