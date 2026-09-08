import { describe, expect, it } from 'vitest';
import { PARAMS } from '@/shared/params';
import { computeShot, eventRateForWind, flightTime, gaussian, heightAt, parseEventParam, pullToRange, sampleEvent } from './physics';

const dMax = 650;

describe('pullToRange', () => {
  it('데드존 경계 → dMin, pMax 이상 → dMax', () => {
    expect(pullToRange(PARAMS.deadZone, dMax, PARAMS)).toBeCloseTo(PARAMS.dMinPx);
    expect(pullToRange(0, dMax, PARAMS)).toBeCloseTo(PARAMS.dMinPx); // 데드존 미만은 dMin으로 포화
    expect(pullToRange(PARAMS.pMax, dMax, PARAMS)).toBeCloseTo(dMax);
    expect(pullToRange(PARAMS.pMax * 3, dMax, PARAMS)).toBeCloseTo(dMax);
  });

  it('단조 증가', () => {
    let prev = -Infinity;
    for (let m = 0; m <= 200; m += 5) {
      const d = pullToRange(m, dMax, PARAMS);
      expect(d).toBeGreaterThanOrEqual(prev);
      prev = d;
    }
  });
});

describe('computeShot', () => {
  const anchor = [195, 674] as const;
  const noEvent = { ...PARAMS, events: { ...PARAMS.events, rate: 0, rateWindy: 0 } };

  // rng ≡ 0.25 → Box–Muller의 cos(2π·0.25) = cos(π/2) ≈ 0 → 잔여 ≈ 0
  const calmRng = () => 0.25;

  it('pull 벡터 방향이 곧 발사 방향, wind=[0,0]이면 landing == aim', () => {
    const shot = computeShot(anchor, [0, -100], dMax, noEvent, calmRng, [0, 0]);
    expect(shot.dir[0]).toBeCloseTo(0);
    expect(shot.dir[1]).toBeCloseTo(-1);
    expect(shot.wind[0]).toBeCloseTo(0, 10);
    expect(shot.wind[1]).toBeCloseTo(0, 10);
    expect(shot.landing[0]).toBeCloseTo(shot.aim[0], 10);
    expect(shot.landing[1]).toBeCloseTo(shot.aim[1], 10);
    expect(shot.d).toBeCloseTo(pullToRange(100, dMax, PARAMS));
    expect(shot.event).toBeNull();
  });

  it('입력 규약: 손가락을 아래로 끌면 pull.y < 0 → 발사는 화면 위(−y)', () => {
    const start = [200, 560];
    const current = [200, 700];
    const pull = [start[0] - current[0], start[1] - current[1]] as const;
    const shot = computeShot(anchor, pull, dMax, noEvent, calmRng);
    expect(shot.dir[1]).toBeLessThan(0);
    expect(shot.landing[1]).toBeLessThan(anchor[1]);
  });

  it('wind=[30,0], d=dMax/2 → drift=[15,0]', () => {
    const target = dMax / 2;
    const u = Math.pow((target - PARAMS.dMinPx) / (dMax - PARAMS.dMinPx), 1 / PARAMS.gamma);
    const mag = PARAMS.deadZone + u * (PARAMS.pMax - PARAMS.deadZone);
    const shot = computeShot(anchor, [0, -mag], dMax, noEvent, calmRng, [30, 0]);
    expect(shot.d).toBeCloseTo(target, 5);
    expect(shot.drift[0]).toBeCloseTo(15, 5);
    expect(shot.drift[1]).toBeCloseTo(0, 10);
  });

  it('잔여는 6·residualSigma·d 이내', () => {
    const pull = [0, -150] as const;
    const seq = [0.1, 0.2, 0.3, 0.4];
    let i = 0;
    const shot = computeShot(anchor, pull, dMax, PARAMS, () => seq[i++ % seq.length], [0, 0]);
    const res = Math.hypot(shot.wind[0] - shot.drift[0], shot.wind[1] - shot.drift[1]);
    expect(res).toBeGreaterThan(0);
    expect(res).toBeLessThan(PARAMS.wind.residualSigma * shot.d * 6);
  });
});

describe('sampleEvent', () => {
  const dir = [0, -1] as const;
  const d = 400;
  const P = PARAMS.events;

  it('rate=0 → null', () => {
    expect(sampleEvent(() => 0.5, { ...P, rate: 0 }, dir, d)).toBeNull();
  });

  it('바람이 약하면 사건 확률↑, 세면 ↓', () => {
    expect(eventRateForWind([0, 0], PARAMS)).toBeCloseTo(PARAMS.events.rate);
    expect(eventRateForWind([PARAMS.wind.maxPx, 0], PARAMS)).toBeCloseTo(PARAMS.events.rateWindy);
    expect(eventRateForWind([PARAMS.wind.maxPx / 2, 0], PARAMS)).toBeCloseTo(
      (PARAMS.events.rate + PARAMS.events.rateWindy) / 2,
    );
  });

  it("force='plane' → kind plane, at∈범위, |kick| ≤ maxKick·d", () => {
    const ev = sampleEvent(() => 0.3, P, dir, d, 'plane');
    expect(ev).not.toBeNull();
    expect(ev!.kind).toBe('plane');
    expect(ev!.at).toBeGreaterThanOrEqual(P.atRange[0]);
    expect(ev!.at).toBeLessThanOrEqual(P.atRange[1]);
    expect(Math.hypot(ev!.kick[0], ev!.kick[1])).toBeLessThanOrEqual(P.maxKick * d + 1e-9);
  });

  it('plane·finger kick ⟂ dir', () => {
    for (const kind of ['plane', 'finger'] as const) {
      const ev = sampleEvent(() => 0.4, P, dir, d, kind)!;
      expect(ev.kick[0] * dir[0] + ev.kick[1] * dir[1]).toBeCloseTo(0, 10);
    }
  });

  it('gull kick ∥ dir', () => {
    const ev = sampleEvent(() => 0.4, P, dir, d, 'gull')!;
    const cross = ev.kick[0] * dir[1] - ev.kick[1] * dir[0];
    expect(cross).toBeCloseTo(0, 10);
  });
});

describe('parseEventParam', () => {
  it('알려진 kind만 통과', () => {
    expect(parseEventParam('?event=plane')).toBe('plane');
    expect(parseEventParam('?event=nope')).toBeUndefined();
    expect(parseEventParam('')).toBeUndefined();
  });
});

describe('flight helpers', () => {
  it('비행 시간은 tMin..tMax', () => {
    expect(flightTime(0, dMax, PARAMS)).toBe(PARAMS.tMin);
    expect(flightTime(dMax, dMax, PARAMS)).toBe(PARAMS.tMax);
    expect(flightTime(dMax * 2, dMax, PARAMS)).toBe(PARAMS.tMax);
  });
  it('높이는 양끝 0, 정점 1', () => {
    expect(heightAt(0)).toBe(0);
    expect(heightAt(1)).toBe(0);
    expect(heightAt(0.5)).toBe(1);
  });
  it('gaussian: 평균 ≈ 0, 표준편차 ≈ 1', () => {
    let s = 0;
    let s2 = 0;
    const n = 20000;
    for (let k = 0; k < n; k++) {
      const g = gaussian();
      s += g;
      s2 += g * g;
    }
    expect(s / n).toBeCloseTo(0, 1);
    expect(Math.sqrt(s2 / n)).toBeCloseTo(1, 1);
  });
});
