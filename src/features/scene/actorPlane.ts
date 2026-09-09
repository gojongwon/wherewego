import { BufferGeometry, Float32BufferAttribute, Group, LineBasicMaterial, LineSegments, Mesh } from 'three';
import type { ActorCtx, ActorFx, ActorInstance } from './actor';
import { Banker, GroundShadow, Sparks, ThroughPath, Trail, VCOL, inWindow, paint, windowS, wobble } from './fx';
import { SCENE_COLORS } from './palette';

const A = SCENE_COLORS.actor;

/** 접은 종이비행기 — 날개 두 장(양각) + 아래 킬 + 접힌 선 + 외곽선. 로컬 +x가 기수 */
function planeBody(): Group {
  const nose = [32, 0, 0];
  const tailL = [-30, 6, -24];
  const tailR = [-30, 6, 24];
  const tailC = [-22, 0, 0];
  const keel = [-24, -9, 0];
  const tri = (a: number[], b: number[], c: number[]) => new Float32BufferAttribute([...a, ...b, ...c], 3);
  const body = new Group();
  const face = (attr: Float32BufferAttribute, hex: string) => {
    const g = new BufferGeometry();
    g.setAttribute('position', attr);
    body.add(new Mesh(paint(g, hex), VCOL));
  };
  face(tri(nose, tailC, tailL), A.plane);
  face(tri(nose, tailR, tailC), A['plane-shade']);
  face(tri(nose, keel, tailC), A['plane-under']);
  const creases = new BufferGeometry();
  creases.setAttribute('position', new Float32BufferAttribute([...nose, ...tailC, ...tailC, ...tailL, ...tailC, ...tailR, ...nose, ...keel], 3));
  body.add(new LineSegments(creases, new LineBasicMaterial({ color: A['plane-crease'] })));
  const outline = new BufferGeometry();
  outline.setAttribute('position', new Float32BufferAttribute([...nose, ...tailL, ...tailL, ...tailC, ...tailC, ...tailR, ...tailR, ...nose], 3));
  body.add(new LineSegments(outline, new LineBasicMaterial({ color: SCENE_COLORS.pinMiss, transparent: true, opacity: 0.55 })));
  return body;
}

/**
 * 종이비행기: 옆에서 활공해 들어와 뱅크하며 방향을 틀고, 화살을 스치는 순간 파닥이며 흔들린 뒤 고도를 조금 잃고 빠져나간다.
 */
export function createPlaneActor(): ActorInstance {
  const group = new Group();
  const body = planeBody();
  group.add(body);
  group.visible = false;
  const shadow = new GroundShadow(20, 9, SCENE_COLORS.shadow);
  const trail = new Trail(10, 1.2, SCENE_COLORS.pinMiss, 0.25);
  const sparks = new Sparks(A.spark, 6);
  const banker = new Banker(1.1, 7);
  let path: ThroughPath | null = null;

  return {
    group,
    extras: [shadow.mesh, trail.group, sparks.group],
    reset() {
      path = null;
      banker.reset();
      trail.clear();
      shadow.hide();
      group.visible = false;
    },
    update(ctx: ActorCtx) {
      const { tau, dt, ev, Pe, hPe, stageW } = ctx;
      sparks.update(dt);
      if (!inWindow(tau, ev.at)) {
        group.visible = false;
        shadow.hide();
        return;
      }
      if (!path) {
        const fromX = ev.side === 1 ? stageW + 90 : -90;
        const toX = ev.side === 1 ? -90 : stageW + 90;
        path = new ThroughPath([fromX, Pe[1] - 150], Pe, [toX, Pe[1] + 170], [toX - fromX, 60], 0.4);
      }
      const p = path.at(windowS(tau, ev.at));
      const sinceHit = tau >= ev.at ? ((tau - ev.at) * ctx.T) / 1000 : -1;
      const bob = 5 * Math.sin(ctx.time * 3.1);
      const y = hPe + bob - (sinceHit > 0 ? 30 * Math.min(1, sinceHit / 0.9) : 0) + 6;
      group.visible = true;
      group.position.set(p.x, y, p.z);
      const roll = banker.update(p.yaw, dt) + wobble(sinceHit, 0.9, 26, 5);
      const pitch = -0.08 + (sinceHit > 0 ? -0.25 * Math.min(1, sinceHit / 0.6) : 0) + wobble(sinceHit, 0.25, 18, 6);
      group.rotation.set(0, p.yaw, 0, 'YZX');
      body.rotation.set(roll, 0, pitch, 'XYZ');
      shadow.set(p.x, p.z, y, p.yaw);
      trail.push(p.x - p.tx * 34, y - 2, p.z - p.tz * 34, dt);
    },
    onImpact(fx: ActorFx, Pe, hPe) {
      fx.shake(2.5);
      sparks.fire(Pe[0], hPe, Pe[1]);
    },
    dispose() {
      shadow.dispose();
      trail.dispose();
      sparks.dispose();
      body.traverse((o) => {
        if (o instanceof Mesh || o instanceof LineSegments) (o.geometry as BufferGeometry).dispose();
      });
    },
  };
}
