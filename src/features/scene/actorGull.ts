import { BufferGeometry, ConeGeometry, Float32BufferAttribute, Group, Mesh, PlaneGeometry, SphereGeometry } from 'three';
import type { ActorCtx, ActorFx, ActorInstance } from './actor';
import { Banker, Burst, GroundShadow, S_HIT, ThroughPath, VCOL, inWindow, paint, windowS, wobble } from './fx';
import { SCENE_COLORS } from './palette';

const A = SCENE_COLORS.actor;

interface Wing {
  side: 1 | -1;
  inner: Group;
  outer: Group;
}

/** 갈매기 — 몸통·머리·부리·눈·꼬리 + 두 마디 날개(안쪽/바깥쪽, 검은 끝). 로컬 +x가 머리 방향 */
function gullModel(): { root: Group; wings: Wing[] } {
  const root = new Group();
  const add = (g: BufferGeometry, hex: string) => root.add(new Mesh(paint(g, hex), VCOL));
  const body = new SphereGeometry(7, 14, 10);
  body.scale(2.1, 1, 1.05);
  add(body, A.gull);
  const head = new SphereGeometry(4.6, 12, 10);
  head.translate(13.5, 4.2, 0);
  add(head, A.gull);
  const beak = new ConeGeometry(1.9, 8, 8);
  beak.rotateZ(-Math.PI / 2);
  beak.translate(21, 3.4, 0);
  add(beak, A.beak);
  for (const dz of [-2.6, 2.6]) {
    const eye = new SphereGeometry(0.8, 6, 6);
    eye.translate(16.5, 5.4, dz);
    add(eye, A['gull-tip']);
  }
  const tail = new BufferGeometry();
  tail.setAttribute('position', new Float32BufferAttribute([-12, 1, 0, -26, 1.5, -6, -26, 1.5, 6], 3));
  add(tail, A['gull-shade']);

  const wings: Wing[] = [];
  for (const side of [-1, 1] as const) {
    const inner = new Group();
    inner.position.set(0, 3, side * 5);
    const innerGeo = new PlaneGeometry(18, 20);
    innerGeo.rotateX(-Math.PI / 2);
    innerGeo.translate(-2, 0, side * 10);
    inner.add(new Mesh(paint(innerGeo, A.gull), VCOL));
    const outer = new Group();
    outer.position.set(0, 0, side * 20);
    const outerGeo = new BufferGeometry();
    outerGeo.setAttribute(
      'position',
      new Float32BufferAttribute([7, 0, 0, -11, 0, 0, -9, 0, side * 24, 7, 0, 0, -9, 0, side * 24, 3, 0, side * 24], 3),
    );
    outer.add(new Mesh(paint(outerGeo, A.gull), VCOL));
    const tip = new BufferGeometry();
    tip.setAttribute(
      'position',
      new Float32BufferAttribute([3, 0.1, side * 24, -9, 0.1, side * 24, -6, 0.1, side * 31, 3, 0.1, side * 24, -6, 0.1, side * 31, 0, 0.1, side * 31], 3),
    );
    outer.add(new Mesh(paint(tip, A['gull-tip']), VCOL));
    inner.add(outer);
    root.add(inner);
    wings.push({ side, inner, outer });
  }
  return { root, wings };
}

/**
 * 갈매기: 두 마디 날개가 시차를 두고 접히며 날갯짓, 방향을 틀 때 몸이 기운다.
 * 화살과 부딪히면 깃털이 흩날리고 놀라서 날갯짓이 빨라지며 고도를 높여 달아난다.
 */
export function createGullActor(): ActorInstance {
  const group = new Group();
  const { root, wings } = gullModel();
  group.add(root);
  group.visible = false;
  const shadow = new GroundShadow(22, 9, SCENE_COLORS.shadow);
  const feathers = new Burst(7, 5, [A.gull, A['gull-shade'], A.gull], { gravity: 25, drag: 1.6, life: 1.1, spin: 5 });
  const banker = new Banker(1.0, 7);
  let path: ThroughPath | null = null;
  let flapPhase = 0;

  return {
    group,
    extras: [shadow.mesh, feathers.group],
    reset() {
      path = null;
      banker.reset();
      shadow.hide();
      group.visible = false;
    },
    update(ctx: ActorCtx) {
      const { tau, dt, ev, Pe, hPe, stageW } = ctx;
      feathers.update(dt);
      if (!inWindow(tau, ev.at)) {
        group.visible = false;
        shadow.hide();
        return;
      }
      if (!path) {
        const fromX = ev.side === 1 ? stageW + 80 : -80;
        const toX = ev.side === 1 ? -80 : stageW + 80;
        path = new ThroughPath([fromX, Pe[1] + 40], Pe, [toX, Pe[1] - 200], [toX - fromX, -140], 0.45);
      }
      const s = windowS(tau, ev.at);
      const p = path.at(s);
      const sinceHit = tau >= ev.at ? ((tau - ev.at) * ctx.T) / 1000 : -1;
      // 진입: 높은 데서 내려와 Pe 높이, 퇴장: 다시 솟아오름
      const u = s < S_HIT ? 1 - s / S_HIT : (s - S_HIT) / (1 - S_HIT);
      const y = hPe + (s < S_HIT ? 55 * u * u : 110 * u * u) + 8;
      // 날갯짓 4.5Hz, 놀라면 1.8배
      const rate = 9 * (sinceHit > 0 ? 1 + 0.8 * Math.exp(-sinceHit * 1.5) : 1);
      flapPhase += rate * dt * Math.PI;
      const flap = Math.sin(flapPhase);
      const lag = Math.sin(flapPhase - 0.9);
      for (const w of wings) {
        w.inner.rotation.x = w.side * (0.55 * flap);
        w.outer.rotation.x = w.side * (0.5 * lag + 0.25);
      }
      const bob = 2.5 * Math.sin(flapPhase + 0.4);
      group.visible = true;
      group.position.set(p.x, y + bob, p.z);
      const roll = banker.update(p.yaw, dt) + wobble(sinceHit, 0.6, 14, 4);
      const pitch = (s < S_HIT ? -0.15 : 0.28) + wobble(sinceHit, 0.35, 12, 5);
      group.rotation.set(0, p.yaw, 0, 'YZX');
      root.rotation.set(roll, 0, pitch, 'XYZ');
      shadow.set(p.x, p.z, y, p.yaw);
    },
    onImpact(fx: ActorFx, Pe, hPe) {
      feathers.fire(Pe[0], hPe + 6, Pe[1], 70, 30);
      fx.shake(2);
    },
    dispose() {
      shadow.dispose();
      feathers.dispose();
      root.traverse((o) => {
        if (o instanceof Mesh) (o.geometry as BufferGeometry).dispose();
      });
    },
  };
}
