import { describe, expect, it } from 'vitest';
import { ACTOR_ENTER, ACTOR_EXIT, Banker, S_HIT, ThroughPath, inWindow, windowS, wobble } from './fx';

describe('사건 창', () => {
  it('windowS: 진입 시작 0, 접촉 S_HIT, 퇴장 끝 1', () => {
    const at = 0.46;
    expect(windowS(at - ACTOR_ENTER, at)).toBe(0);
    expect(windowS(at, at)).toBeCloseTo(S_HIT, 9);
    expect(windowS(at + ACTOR_EXIT, at)).toBe(1);
    expect(windowS(0, at)).toBe(0);
    expect(windowS(1, at)).toBe(1);
  });
  it('inWindow 경계', () => {
    expect(inWindow(0.46 - ACTOR_ENTER - 0.001, 0.46)).toBe(false);
    expect(inWindow(0.46 + ACTOR_EXIT + 0.001, 0.46)).toBe(false);
    expect(inWindow(0.46, 0.46)).toBe(true);
  });
});

describe('ThroughPath', () => {
  const Pe = [200, 400] as const;
  const path = new ThroughPath([-90, 250], Pe, [480, 570], [570, 60], 0.4);
  it('s=S_HIT에서 정확히 Pe', () => {
    const p = path.at(S_HIT);
    expect(p.x).toBeCloseTo(Pe[0], 6);
    expect(p.z).toBeCloseTo(Pe[1], 6);
  });
  it('시작·끝점, 그리고 Pe 전후 접선이 이어진다', () => {
    expect(path.at(0).x).toBeCloseTo(-90, 6);
    expect(path.at(1).x).toBeCloseTo(480, 6);
    const a = path.at(S_HIT - 1e-4);
    const b = path.at(S_HIT + 1e-4);
    expect(Math.hypot(a.tx - b.tx, a.tz - b.tz)).toBeLessThan(0.05);
  });
});

describe('Banker / wobble', () => {
  it('뱅크는 ±0.9 안, 요가 일정하면 0으로 돌아간다', () => {
    const b = new Banker(1.1, 7);
    let r = 0;
    for (let i = 0; i < 60; i++) r = b.update(i * 0.2, 1 / 60); // 빠른 회전
    expect(Math.abs(r)).toBeLessThanOrEqual(0.9);
    for (let i = 0; i < 300; i++) r = b.update(12, 1 / 60); // 정지
    expect(Math.abs(r)).toBeLessThan(0.01);
  });
  it('wobble: 음수·비유한 시간은 0, 감쇠한다', () => {
    expect(wobble(-1, 1, 20, 5)).toBe(0);
    expect(wobble(Number.POSITIVE_INFINITY, 1, 20, 5)).toBe(0);
    expect(wobble(Number.NaN, 1, 20, 5)).toBe(0);
    expect(Math.abs(wobble(0.05, 1, 20, 5))).toBeGreaterThan(Math.abs(wobble(1.5, 1, 20, 5)));
  });
});
