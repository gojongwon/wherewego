import { describe, expect, it } from 'vitest';
import { PARAMS } from '@/shared/params';
import { windAt } from './wind';

const P = PARAMS.wind;

describe('windAt', () => {
  it('같은 seed·t → 같은 값', () => {
    expect(windAt(1, 400, P)).toEqual(windAt(1, 400, P));
  });

  it('|w| ≤ maxPx', () => {
    for (let t = 0; t < 20_000; t += 37) {
      const w = windAt(42, t, P);
      expect(Math.hypot(w[0], w[1])).toBeLessThanOrEqual(P.maxPx + 1e-9);
    }
  });

  it('16ms 간격 연속 |Δw| < 1px', () => {
    for (let t = 0; t < 8_000; t += 200) {
      const a = windAt(7, t, P);
      const b = windAt(7, t + 16, P);
      expect(Math.hypot(b[0] - a[0], b[1] - a[1])).toBeLessThan(1);
    }
  });

  it('seed가 다르면 다른 값', () => {
    expect(windAt(1, 1000, P)).not.toEqual(windAt(2, 1000, P));
  });
});
