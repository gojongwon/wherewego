import { describe, expect, it } from 'vitest';
import { PARAMS } from '@/shared/params';
import { computeShot, flightTime, gaussian, heightAt, pullToRange } from './physics';

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

  // rng ≡ 0.25 → Box–Muller의 cos(2π·0.25) = cos(π/2) ≈ 0 → 바람 ≈ 0
  const calmRng = () => 0.25;

  it('pull 벡터 방향이 곧 발사 방향, 바람 0이면 landing == aim', () => {
    const shot = computeShot(anchor, [0, -100], dMax, PARAMS, calmRng);
    expect(shot.dir[0]).toBeCloseTo(0);
    expect(shot.dir[1]).toBeCloseTo(-1);
    expect(shot.wind[0]).toBeCloseTo(0, 10);
    expect(shot.wind[1]).toBeCloseTo(0, 10);
    expect(shot.landing[0]).toBeCloseTo(shot.aim[0], 10);
    expect(shot.landing[1]).toBeCloseTo(shot.aim[1], 10);
    expect(shot.d).toBeCloseTo(pullToRange(100, dMax, PARAMS));
  });

  it('입력 규약: 손가락을 아래로 끌면 pull.y < 0 → 발사는 화면 위(−y)', () => {
    // usePull: pull = start − current
    const start = [200, 560];
    const current = [200, 700];
    const pull = [start[0] - current[0], start[1] - current[1]] as const;
    const shot = computeShot(anchor, pull, dMax, PARAMS, calmRng);
    expect(shot.dir[1]).toBeLessThan(0);
    expect(shot.landing[1]).toBeLessThan(anchor[1]);
  });

  it('바람은 사거리 비례 σ로 흔든다', () => {
    const pull = [0, -150] as const;
    const calm = computeShot(anchor, pull, dMax, PARAMS, calmRng);
    // 결정론적 rng로 바람이 생기게
    const seq = [0.1, 0.2, 0.3, 0.4];
    let i = 0;
    const windy = computeShot(anchor, pull, dMax, PARAMS, () => seq[i++ % seq.length]);
    expect(windy.aim).toEqual(calm.aim);
    const windMag = Math.hypot(windy.wind[0], windy.wind[1]);
    expect(windMag).toBeGreaterThan(0);
    expect(windMag).toBeLessThan(PARAMS.windSigma * calm.d * 6); // 6σ 이내
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
