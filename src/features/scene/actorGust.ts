import { CatmullRomCurve3, Color, DoubleSide, Float32BufferAttribute, Group, Mesh, MeshBasicMaterial, PlaneGeometry, TubeGeometry, Vector3 } from 'three';
import { clamp } from '@/shared/geo';
import type { ActorCtx, ActorFx, ActorInstance } from './actor';
import { RingBurst, S_HIT, easeOutBack, inWindow, windowS } from './fx';
import { SCENE_COLORS } from './palette';

const A = SCENE_COLORS.actor;
const TUBULAR = 60;
const RADIAL = 6;

/** 나선 줄기 하나 — 위로 오르며 넓어지는 헬릭스 튜브. 정점 알파로 위쪽이 흩어진다 */
function streak(phase: number, turns: number, r0: number, r1: number, h: number, hex: string, opacity: number): Mesh<TubeGeometry, MeshBasicMaterial> {
  const pts: Vector3[] = [];
  const N = 40;
  for (let i = 0; i <= N; i++) {
    const t = i / N;
    const a = phase + t * turns * Math.PI * 2;
    const r = r0 + (r1 - r0) * t;
    pts.push(new Vector3(Math.cos(a) * r, t * h, Math.sin(a) * r));
  }
  const geo = new TubeGeometry(new CatmullRomCurve3(pts), TUBULAR, 1.1, RADIAL, false);
  const c = new Color(hex);
  const n = geo.attributes.position.count;
  const rgba = new Float32Array(n * 4);
  for (let i = 0; i < n; i++) {
    const u = Math.floor(i / (RADIAL + 1)) / TUBULAR;
    rgba.set([c.r, c.g, c.b, Math.pow(1 - u, 1.4) * 0.9 + 0.1], i * 4);
  }
  geo.setAttribute('color', new Float32BufferAttribute(rgba, 4));
  return new Mesh(geo, new MeshBasicMaterial({ vertexColors: true, transparent: true, opacity, depthWrite: false, side: DoubleSide }));
}

interface Debris {
  m: Mesh<PlaneGeometry, MeshBasicMaterial>;
  a: number;
  r: number;
  h0: number;
  spin: number;
}

/**
 * 돌풍: 땅에서 먼지 링이 퍼지며 회오리가 솟고, 나선 줄기 네 가닥이 돌면서 잎·꽃잎이 궤도를 그리며 오른다.
 * 화살은 휘말려 두 바퀴 돌며 밀리고(fx.arrowSpin), 회오리는 위로 늘어나며 흩어진다.
 */
export function createGustActor(): ActorInstance {
  const group = new Group();
  group.visible = false;
  const vortex = new Group();
  const baseOpacity = [0.55, 0.5, 0.45, 0.35];
  const streaks = [
    streak(0, 1.6, 8, 40, 78, A.gust, baseOpacity[0]),
    streak(2.1, 1.4, 12, 46, 82, A['gust-light'], baseOpacity[1]),
    streak(4.2, 1.7, 6, 36, 74, A.gust, baseOpacity[2]),
    streak(1.0, 1.2, 16, 52, 88, A['gust-light'], baseOpacity[3]),
  ];
  for (const s of streaks) vortex.add(s);
  group.add(vortex);
  const debris: Debris[] = [];
  const colors = [A.leaf, A.petal, A.leaf, SCENE_COLORS.land];
  for (let i = 0; i < 12; i++) {
    const m = new Mesh(
      new PlaneGeometry(5 + Math.random() * 3, 3 + Math.random() * 2),
      new MeshBasicMaterial({ color: colors[i % colors.length], side: DoubleSide, transparent: true, opacity: 0.95 }),
    );
    group.add(m);
    debris.push({ m, a: (i / 12) * Math.PI * 2, r: 10 + (i % 4) * 9, h0: (i * 7) % 60, spin: 4 + Math.random() * 5 });
  }
  const dust = new RingBurst(A.gust, 0.12);
  const dust2 = new RingBurst(A['gust-light'], 0.08);
  let dusted = false;

  return {
    group,
    extras: [dust.mesh, dust2.mesh],
    reset() {
      dusted = false;
      group.visible = false;
    },
    update(ctx: ActorCtx) {
      const { tau, dt, ev, Pe } = ctx;
      dust.update(dt);
      dust2.update(dt);
      if (!inWindow(tau, ev.at)) {
        group.visible = false;
        return;
      }
      const s = windowS(tau, ev.at);
      const grow = s < S_HIT ? easeOutBack(clamp(s / S_HIT, 0, 1)) : 1;
      const fade = s > S_HIT ? clamp((s - S_HIT) / (1 - S_HIT), 0, 1) : 0;
      group.visible = true;
      group.position.set(Pe[0], 0.6, Pe[1]);
      group.scale.set(grow, grow * (1 + 0.6 * fade), grow);
      vortex.rotation.y = ctx.time * 7.5;
      streaks.forEach((m, i) => {
        m.material.opacity = baseOpacity[i] * (1 - fade) * clamp(grow, 0, 1);
      });
      const T = ctx.time;
      for (const d of debris) {
        const h = (d.h0 + T * 45) % 85;
        const r = d.r * (0.5 + h / 85);
        const a = d.a + T * 6.5 + h * 0.03;
        d.m.position.set(Math.cos(a) * r, h + 2, Math.sin(a) * r);
        d.m.rotation.set(T * d.spin, a, T * d.spin * 0.7);
        d.m.material.opacity = 0.95 * (1 - fade) * clamp(1 - h / 95, 0, 1);
      }
      if (!dusted && s > 0.02) {
        dusted = true;
        dust.fire(Pe[0], 0.5, Pe[1], 46, 0.7);
      }
    },
    onImpact(fx: ActorFx, Pe) {
      dust2.fire(Pe[0], 0.5, Pe[1], 60, 0.6);
      fx.shake(2);
      fx.arrowSpin(2);
    },
    dispose() {
      dust.dispose();
      dust2.dispose();
      for (const s of streaks) {
        s.geometry.dispose();
        s.material.dispose();
      }
      for (const d of debris) {
        d.m.geometry.dispose();
        d.m.material.dispose();
      }
    },
  };
}
