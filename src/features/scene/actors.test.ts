import { describe, expect, it } from 'vitest';
import type { FlightEvent } from '@/features/shooter';
import type { ActorCtx, ActorFx } from './actor';
import { createActor } from './EventActor';

const Pe = [200, 400] as const;
const ctx = (kind: FlightEvent['kind'], tau: number): ActorCtx => ({
  tau,
  dt: 1 / 60,
  time: tau * 2,
  ev: { kind, at: 0.46, side: 1, kick: [30, -10] },
  Pe,
  hPe: 60,
  stageW: 390,
  T: 1200,
});
const fx: ActorFx = { shake: () => {}, arrowSpin: () => {} };

describe('사건 액터 4종', () => {
  for (const kind of ['plane', 'finger', 'gull', 'gust'] as const) {
    it(`${kind}: 창 밖에선 숨고, 접촉 순간엔 Pe 근처에 있고, 값이 유한하다`, () => {
      const a = createActor(kind);
      a.reset();
      a.update(ctx(kind, 0.05));
      expect(a.group.visible).toBe(false);
      // 진입~접촉까지 프레임 단위로 진행 (경로·뱅크 상태가 쌓임)
      for (let tau = 0.46 - 0.35; tau <= 0.46; tau += 1 / 120) a.update(ctx(kind, tau));
      a.onImpact(fx, Pe, 60);
      a.update(ctx(kind, 0.46));
      expect(a.group.visible).toBe(true);
      const p = a.group.position;
      expect(Number.isFinite(p.x + p.y + p.z)).toBe(true);
      const dx = p.x - Pe[0];
      const dz = p.z - Pe[1];
      // 손은 손끝이 Pe 옆 3px, 나머지는 Pe 위
      expect(Math.hypot(dx, dz)).toBeLessThan(kind === 'finger' ? 6 : 1e-3);
      a.update(ctx(kind, 0.46 + 0.45 + 0.01));
      expect(a.group.visible).toBe(false);
      a.dispose();
    });
  }
});
