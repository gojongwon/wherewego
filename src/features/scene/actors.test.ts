import { describe, expect, it } from 'vitest';
import type { FlightEvent } from '@/features/shooter';
import { ACTOR_ENTER, ACTOR_EXIT, actorPose } from './actors';

const Pe = [200, 400] as const;
const H = 60;
const W = 390;
const base = (kind: FlightEvent['kind']): FlightEvent => ({ kind, at: 0.5, side: 1, kick: [10, 0] });

describe('actorPose', () => {
  it('창 밖이면 null', () => {
    const ev = base('plane');
    expect(actorPose('plane', ev.at - ACTOR_ENTER - 0.01, ev, Pe, H, W)).toBeNull();
    expect(actorPose('plane', ev.at + ACTOR_EXIT + 0.01, ev, Pe, H, W)).toBeNull();
  });

  it('τ=at에서 Pe를 지난다 (4종)', () => {
    for (const kind of ['plane', 'finger', 'gull', 'gust'] as const) {
      const ev = base(kind);
      const p = actorPose(kind, ev.at, ev, Pe, H, W)!;
      expect(p.x, kind).toBeCloseTo(Pe[0], 5);
      expect(p.z, kind).toBeCloseTo(Pe[1], 5);
    }
  });

  it('창 안이면 위치·스케일이 유한', () => {
    const ev = base('gust');
    const p = actorPose('gust', ev.at - 0.1, ev, Pe, H, W)!;
    expect(p.scale).toBeGreaterThan(0);
    expect(p.scale).toBeLessThanOrEqual(1);
  });
});
