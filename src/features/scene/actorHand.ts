import {
  BufferGeometry,
  CapsuleGeometry,
  EdgesGeometry,
  ExtrudeGeometry,
  Group,
  LineBasicMaterial,
  LineSegments,
  Mesh,
  Shape,
  ShapeGeometry,
  SphereGeometry,
  TorusGeometry,
} from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import type { ActorCtx, ActorFx, ActorInstance } from './actor';
import { GroundShadow, S_HIT, Sparks, VCOL, easeInCubic, easeInOut, easeOutBack, inWindow, outlineMaterial, outlined, paint, windowS, wobble } from './fx';
import { SCENE_COLORS } from './palette';

const A = SCENE_COLORS.actor;
const OUTLINE = outlineMaterial(A['skin-outline']);
const NAIL_EDGE = new LineBasicMaterial({ color: A['skin-outline'] });

/** 둥근 손톱 판 (+ 외곽선) */
function nailMesh(w: number, h: number): Group {
  const r = Math.min(w, h) * 0.42;
  const s = new Shape();
  s.moveTo(-w / 2 + r, -h / 2);
  s.lineTo(w / 2 - r, -h / 2);
  s.quadraticCurveTo(w / 2, -h / 2, w / 2, -h / 2 + r);
  s.lineTo(w / 2, h / 2 - r);
  s.quadraticCurveTo(w / 2, h / 2, w / 2 - r, h / 2);
  s.lineTo(-w / 2 + r, h / 2);
  s.quadraticCurveTo(-w / 2, h / 2, -w / 2, h / 2 - r);
  s.lineTo(-w / 2, -h / 2 + r);
  s.quadraticCurveTo(-w / 2, -h / 2, -w / 2 + r, -h / 2);
  const geo = new ShapeGeometry(s, 8);
  const g = new Group();
  g.add(new Mesh(paint(geo, A.nail), VCOL));
  g.add(new LineSegments(new EdgesGeometry(geo), NAIL_EDGE));
  return g;
}

/** 손바닥 — 위에서 본 실루엣: 손가락 쪽이 넓고 손목 쪽이 좁다. 베벨로 모서리를 둥글게. 로컬 +x = 손가락 방향 */
function palmGeo(): ExtrudeGeometry {
  const s = new Shape();
  const pts: [number, number][] = [[30, -20], [38, 10], [34, 40], [10, 46], [-26, 40], [-34, 14], [-34, -18], [-20, -30]];
  s.moveTo(pts[0][0], -pts[0][1]);
  for (let i = 1; i <= pts.length; i++) {
    const a = pts[i % pts.length];
    const prev = pts[i - 1];
    s.quadraticCurveTo(prev[0], -prev[1], (prev[0] + a[0]) / 2, -(prev[1] + a[1]) / 2);
  }
  const geo = new ExtrudeGeometry(s, { depth: 14, bevelEnabled: true, bevelThickness: 5, bevelSize: 5, bevelSegments: 3 });
  geo.rotateX(-Math.PI / 2);
  geo.translate(0, -12, 0);
  geo.computeVertexNormals();
  return geo;
}

/**
 * 가리키는 손 (👉) — 검지만 펴고 나머지 셋은 접히고 엄지는 옆으로, 손목 뒤엔 소매. 전체에 카툰 외곽선.
 * 원점 = 검지 끝, +x = 가리키는 방향. 검지 끝마디는 별도 피벗(tip)이라 접촉 순간 살짝 굽는다.
 */
function handModel(): { hand: Group; tip: Group } {
  const g = new Group();
  const skin = (geo: BufferGeometry, w?: number) => g.add(outlined(geo, A.skin, OUTLINE, w));
  const LEN = 90;
  const R = 13;
  const JOINT = -(LEN * 0.42 + R);

  // 검지 끝마디 (피벗 = JOINT)
  const tip = new Group();
  tip.position.set(JOINT, 0, 0);
  const tipGeo = new CapsuleGeometry(R * 0.9, LEN * 0.42, 6, 14);
  tipGeo.rotateZ(-Math.PI / 2);
  tipGeo.translate(-JOINT - (LEN * 0.21 + R * 0.9), 0, 0);
  tip.add(outlined(tipGeo, A.skin, OUTLINE));
  const nail = nailMesh(15, 10.5);
  nail.rotation.set(-Math.PI / 2, 0, -0.28);
  nail.position.set(-JOINT - 9.5, R * 0.9 - 1.4, 0);
  tip.add(nail);
  g.add(tip);

  // 검지 뿌리마디 + 마디 주름
  const baseGeo = new CapsuleGeometry(R, LEN * 0.5, 6, 14);
  baseGeo.rotateZ(-Math.PI / 2);
  baseGeo.translate(JOINT - (LEN * 0.25 + R * 0.2), 0, 0);
  skin(baseGeo);
  const crease = new TorusGeometry(R * 0.95, 0.75, 6, 22);
  crease.rotateY(Math.PI / 2);
  crease.translate(JOINT, 0, 0);
  g.add(new Mesh(paint(crease, A['skin-shade']), VCOL));

  // 손바닥 — 검지는 손바닥 앞 왼쪽 모서리에서 나온다
  const PALM_X = JOINT - LEN * 0.5 - 30;
  const palm = palmGeo();
  palm.translate(PALM_X, 0, 8);
  skin(palm, 1.0);
  const web = new SphereGeometry(R * 1.05, 14, 10);
  web.scale(1.4, 1, 1);
  web.translate(PALM_X + 30, 0, 0);
  g.add(new Mesh(paint(web, A.skin), VCOL));

  // 접힌 손가락 셋 — 관절(구)이 한 줄로, 그 아래로 짧은 마디가 굽어 내려간다
  const front = PALM_X + 36;
  ([[20, 12.5], [39, 12], [56, 10.5]] as const).forEach(([dz, r], i) => {
    const knuckle = new SphereGeometry(r, 14, 10);
    knuckle.translate(front - i * 3, 0, dz);
    skin(knuckle);
    const seg = new CapsuleGeometry(r * 0.92, 14, 5, 12);
    seg.rotateZ(-Math.PI / 2);
    seg.rotateZ(-1.15);
    seg.translate(front - i * 3 + 6, -9, dz);
    g.add(outlined(seg, A['skin-shade'], OUTLINE));
  });

  // 엄지 — 두 마디 + 손톱
  const t1 = new CapsuleGeometry(12, 22, 5, 12);
  t1.rotateZ(-Math.PI / 2);
  t1.rotateY(0.62);
  t1.translate(PALM_X + 8, 1, -36);
  skin(t1);
  const t2 = new CapsuleGeometry(10.5, 20, 5, 12);
  t2.rotateZ(-Math.PI / 2);
  t2.rotateY(0.95);
  t2.translate(PALM_X + 30, 2, -54);
  skin(t2);
  const tNail = nailMesh(11, 8);
  tNail.position.set(PALM_X + 38, 11.4, -65);
  tNail.rotation.set(-Math.PI / 2, 0.95, 0, 'YXZ');
  g.add(tNail);

  // 손목 + 커프 + 소매
  const wrist = new RoundedBoxGeometry(30, 22, 46, 3, 10);
  wrist.translate(PALM_X - 44, -1, 6);
  skin(wrist);
  const cuff = new RoundedBoxGeometry(24, 32, 64, 3, 8);
  cuff.translate(PALM_X - 68, 0, 6);
  g.add(new Mesh(paint(cuff, A['sleeve-dark']), VCOL));
  const sleeve = new RoundedBoxGeometry(150, 30, 60, 3, 10);
  sleeve.translate(PALM_X - 154, 0, 6);
  g.add(new Mesh(paint(sleeve, A.sleeve), VCOL));
  return { hand: g, tip };
}

/**
 * 손: 소매 밖으로 나온 손이 검지로 가리키며 미끄러져 들어와 살짝 넘치듯 멈추고, 뒤로 젖혔다가 톡 친다.
 * 닿는 순간 끝마디가 굽고 손이 4px 내려앉으며 접점 불꽃, 반동 후 퇴장.
 */
export function createHandActor(): ActorInstance {
  const group = new Group();
  const { hand, tip } = handModel();
  group.add(hand);
  group.visible = false;
  const shadow = new GroundShadow(100, 24, SCENE_COLORS.shadow);
  const sparks = new Sparks(SCENE_COLORS.arrowAccent, 6);

  return {
    group,
    extras: [shadow.mesh, sparks.group],
    reset() {
      shadow.hide();
      group.visible = false;
      tip.rotation.set(0, 0, 0);
    },
    update(ctx: ActorCtx) {
      const { tau, dt, ev, Pe, hPe, stageW } = ctx;
      sparks.update(dt);
      if (!inWindow(tau, ev.at)) {
        group.visible = false;
        shadow.hide();
        return;
      }
      const s = windowS(tau, ev.at);
      const side = ev.side;
      const edgeX = side === 1 ? stageW + 130 : -130;
      const readyX = Pe[0] + side * 58;
      const backX = Pe[0] + side * 88;
      const recoilX = Pe[0] + side * 82;
      const touchX = Pe[0] + side * 3;
      let x: number;
      if (s < 0.28) x = edgeX + (readyX - edgeX) * easeOutBack(s / 0.28); // 미끄러져 들어와 살짝 넘침
      else if (s < 0.39) x = readyX + (backX - readyX) * easeInOut((s - 0.28) / 0.11); // 예비 동작
      else if (s < S_HIT) x = backX + (touchX - backX) * easeInCubic((s - 0.39) / (S_HIT - 0.39)); // 톡
      else if (s < 0.56) x = touchX + (recoilX - touchX) * (1 - Math.pow(1 - (s - S_HIT) / (0.56 - S_HIT), 2)); // 반동
      else x = recoilX + (edgeX - recoilX) * easeInCubic((s - 0.56) / 0.44); // 퇴장
      const sinceHit = tau >= ev.at ? ((tau - ev.at) * ctx.T) / 1000 : -1;
      const press = sinceHit >= 0 ? Math.min(1, sinceHit / 0.06) * Math.exp(-sinceHit * 7) : 0;
      const y = hPe + 3 * Math.sin(ctx.time * 2.2) - 4 * press;
      group.visible = true;
      group.position.set(x, y, Pe[1]);
      group.rotation.set(0, side === 1 ? Math.PI : 0, 0);
      const lift = s >= 0.28 && s < S_HIT ? 0.14 * easeInOut((s - 0.28) / (S_HIT - 0.28)) : 0;
      hand.rotation.set(0, 0, -lift + wobble(sinceHit, 0.18, 20, 7), 'XYZ');
      tip.rotation.set(0, 0, -0.45 * press, 'XYZ');
      shadow.set(x + side * 125, Pe[1] + 6, y);
    },
    onImpact(fx: ActorFx, Pe, hPe) {
      fx.shake(3);
      sparks.fire(Pe[0], hPe, Pe[1]);
    },
    dispose() {
      shadow.dispose();
      sparks.dispose();
      hand.traverse((o) => {
        if (o instanceof Mesh || o instanceof LineSegments) (o.geometry as BufferGeometry).dispose();
      });
    },
  };
}
