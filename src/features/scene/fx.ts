import {
  BackSide,
  BufferGeometry,
  CircleGeometry,
  Color,
  CubicBezierCurve,
  DoubleSide,
  Float32BufferAttribute,
  Group,
  Mesh,
  MeshBasicMaterial,
  PlaneGeometry,
  RingGeometry,
  Vector2,
  Vector3,
} from 'three';
import { invalidate } from '@react-three/fiber';
import { clamp, type Point } from '@/shared/geo';
import { yawOf } from './pose';

/* ---------- 이징 ---------- */
export const easeInOut = (t: number): number => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);
export const easeInCubic = (t: number): number => t * t * t;
export const easeOutBack = (t: number): number => {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
};
/** 임팩트 뒤 감쇠 진동 (플러터·반동). t<0 또는 비유한이면 0 */
export const wobble = (t: number, amp: number, freq: number, decay: number): number =>
  !Number.isFinite(t) || t < 0 ? 0 : amp * Math.exp(-decay * t) * Math.sin(freq * t);

/* ---------- 정점색 / 재질 ---------- */
export function paint<G extends BufferGeometry>(g: G, hex: string): G {
  const c = new Color(hex);
  const n = g.attributes.position.count;
  const colors = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) colors.set([c.r, c.g, c.b], i * 3);
  g.setAttribute('color', new Float32BufferAttribute(colors, 3));
  return g;
}
/** 정점색 + 양면. 액터 지오메트리 공용 */
export const VCOL = new MeshBasicMaterial({ vertexColors: true, side: DoubleSide });

/** 카툰 외곽선 — 노멀 방향으로 w만큼 부풀린 복제를 뒷면만 그린다 (인버티드 헐) */
export function outlined(geo: BufferGeometry, hex: string, outlineMat: MeshBasicMaterial, w = 1.15): Group {
  const g = new Group();
  g.add(new Mesh(paint(geo, hex), VCOL));
  const o = geo.clone();
  if (!o.attributes.normal) o.computeVertexNormals();
  const p = o.attributes.position;
  const n = o.attributes.normal;
  for (let i = 0; i < p.count; i++) p.setXYZ(i, p.getX(i) + n.getX(i) * w, p.getY(i) + n.getY(i) * w, p.getZ(i) + n.getZ(i) * w);
  o.deleteAttribute('color');
  g.add(new Mesh(o, outlineMat));
  return g;
}
export const outlineMaterial = (hex: string): MeshBasicMaterial => new MeshBasicMaterial({ color: hex, side: BackSide });

/* ---------- 사건 창 ---------- */
/** 진입 [at−ENTER, at] · 퇴장 [at, at+EXIT] */
export const ACTOR_ENTER = 0.35;
export const ACTOR_EXIT = 0.45;
/** 사건 창 안 진행 s(0..1)에서 접촉 순간 */
export const S_HIT = ACTOR_ENTER / (ACTOR_ENTER + ACTOR_EXIT);
export const windowS = (tau: number, at: number): number => clamp((tau - (at - ACTOR_ENTER)) / (ACTOR_ENTER + ACTOR_EXIT), 0, 1);
export const inWindow = (tau: number, at: number): boolean => tau >= at - ACTOR_ENTER && tau <= at + ACTOR_EXIT;

/* ---------- 경로 ---------- */
export interface PathSample {
  x: number;
  z: number;
  yaw: number;
  tx: number;
  tz: number;
}
/** 두 구간 3차 베지어: 진입(P0→Pe), 퇴장(Pe→P3). Pe에서 접선 D로 이어진다. s=S_HIT에서 정확히 Pe */
export class ThroughPath {
  private a: CubicBezierCurve;
  private b: CubicBezierCurve;
  constructor(P0: Point, Pe: Point, P3: Point, D: Point, bend = 0.35) {
    const d = new Vector2(D[0], D[1]).normalize();
    const len0 = Math.hypot(Pe[0] - P0[0], Pe[1] - P0[1]);
    const len1 = Math.hypot(P3[0] - Pe[0], P3[1] - Pe[1]);
    this.a = new CubicBezierCurve(
      new Vector2(P0[0], P0[1]),
      new Vector2(P0[0] + (Pe[0] - P0[0]) * bend, P0[1] + (Pe[1] - P0[1]) * bend * 0.4),
      new Vector2(Pe[0] - d.x * len0 * bend, Pe[1] - d.y * len0 * bend),
      new Vector2(Pe[0], Pe[1]),
    );
    this.b = new CubicBezierCurve(
      new Vector2(Pe[0], Pe[1]),
      new Vector2(Pe[0] + d.x * len1 * bend, Pe[1] + d.y * len1 * bend),
      new Vector2(P3[0] - (P3[0] - Pe[0]) * bend * 0.4, P3[1] - (P3[1] - Pe[1]) * bend),
      new Vector2(P3[0], P3[1]),
    );
  }
  at(s: number): PathSample {
    const seg = s < S_HIT ? this.a : this.b;
    const u = clamp(s < S_HIT ? s / S_HIT : (s - S_HIT) / (1 - S_HIT), 0, 1);
    const p = seg.getPoint(u);
    const t = seg.getTangent(clamp(u, 0.001, 0.999));
    return { x: p.x, z: p.y, yaw: yawOf(t.x, t.y), tx: t.x, tz: t.y };
  }
}

/** 요 변화율 → 뱅크(롤). 방향을 틀 때 몸이 기운다 */
export class Banker {
  private prevYaw: number | null = null;
  roll = 0;
  constructor(private k = 0.9, private damp = 8) {}
  update(yaw: number, dt: number): number {
    if (this.prevYaw === null) this.prevYaw = yaw;
    let d = yaw - this.prevYaw;
    if (d > Math.PI) d -= Math.PI * 2;
    if (d < -Math.PI) d += Math.PI * 2;
    this.prevYaw = yaw;
    const target = clamp((-d / Math.max(dt, 1e-3)) * this.k * 0.05, -0.9, 0.9);
    this.roll += (target - this.roll) * Math.min(1, this.damp * dt);
    return this.roll;
  }
  reset(): void {
    this.prevYaw = null;
    this.roll = 0;
  }
}

/* ---------- 지면 그림자 ---------- */
export class GroundShadow {
  readonly mesh: Mesh;
  private mat: MeshBasicMaterial;
  constructor(
    private rx = 14,
    private rz = 6,
    hex = '#2B2118',
  ) {
    this.mat = new MeshBasicMaterial({ color: hex, transparent: true, opacity: 0.18, depthWrite: false });
    this.mesh = new Mesh(new CircleGeometry(1, 24).rotateX(-Math.PI / 2), this.mat);
    this.mesh.renderOrder = 1;
    this.mesh.visible = false;
  }
  set(x: number, z: number, height: number, yaw = 0, scale = 1): void {
    const k = 1 + height / 140;
    this.mesh.position.set(x, 0.35, z);
    this.mesh.rotation.y = yaw;
    this.mesh.scale.set(this.rx * k * scale, 1, this.rz * k * scale);
    this.mat.opacity = clamp(0.22 - height / 900, 0.05, 0.22);
    this.mesh.visible = true;
  }
  hide(): void {
    this.mesh.visible = false;
  }
  dispose(): void {
    this.mesh.geometry.dispose();
    this.mat.dispose();
  }
}

/* ---------- 파티클 ---------- */
interface BurstItem {
  m: Mesh<PlaneGeometry, MeshBasicMaterial>;
  v: Vector3;
  w: Vector3;
  t: number;
  alive: boolean;
}
/** 짧은 파티클 버스트 (깃털·불꽃). 각 파티클은 작은 사각형 */
export class Burst {
  readonly group = new Group();
  private items: BurstItem[] = [];
  private opts: { gravity: number; drag: number; life: number; spin: number };
  constructor(count: number, size: number, colors: readonly string[], opts: Partial<Burst['opts']> = {}) {
    this.opts = { gravity: 60, drag: 2.2, life: 0.9, spin: 6, ...opts };
    for (let i = 0; i < count; i++) {
      const geo = new PlaneGeometry(size * (0.7 + Math.random() * 0.6), size * (0.5 + Math.random() * 0.5));
      const mat = new MeshBasicMaterial({ color: colors[i % colors.length], side: DoubleSide, transparent: true, opacity: 1 });
      const m = new Mesh(geo, mat);
      m.visible = false;
      this.group.add(m);
      this.items.push({ m, v: new Vector3(), w: new Vector3(), t: 0, alive: false });
    }
  }
  fire(x: number, y: number, z: number, speed = 90, up = 40): void {
    for (const it of this.items) {
      const a = Math.random() * Math.PI * 2;
      const s = speed * (0.4 + Math.random() * 0.6);
      it.v.set(Math.cos(a) * s, up * (0.5 + Math.random()), Math.sin(a) * s);
      it.w.set(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).multiplyScalar(this.opts.spin);
      it.m.position.set(x, y, z);
      it.m.rotation.set(Math.random() * 3, Math.random() * 3, Math.random() * 3);
      it.m.material.opacity = 1;
      it.m.visible = true;
      it.t = 0;
      it.alive = true;
    }
  }
  /** 살아있는 파티클이 있으면 true (invalidate 판단용) */
  update(dt: number): boolean {
    let any = false;
    for (const it of this.items) {
      if (!it.alive) continue;
      any = true;
      it.t += dt;
      it.v.y -= this.opts.gravity * dt;
      it.v.multiplyScalar(Math.max(0, 1 - this.opts.drag * dt));
      it.m.position.addScaledVector(it.v, dt);
      it.m.rotation.x += it.w.x * dt;
      it.m.rotation.y += it.w.y * dt;
      it.m.rotation.z += it.w.z * dt;
      const u = it.t / this.opts.life;
      it.m.material.opacity = clamp(1 - u * u, 0, 1);
      if (it.m.position.y < 0.5) {
        it.m.position.y = 0.5;
        it.v.set(0, 0, 0);
      }
      if (u >= 1) {
        it.alive = false;
        it.m.visible = false;
      }
    }
    return any;
  }
  dispose(): void {
    for (const it of this.items) {
      it.m.geometry.dispose();
      it.m.material.dispose();
    }
  }
}

/** 접촉 링 — 얇은 링이 커지며 사라진다 */
export class RingBurst {
  readonly mesh: Mesh<RingGeometry, MeshBasicMaterial>;
  private t = -1;
  private dur = 0.45;
  private r1 = 34;
  private readonly r0 = 6;
  constructor(hex: string, width = 0.08) {
    this.mesh = new Mesh(
      new RingGeometry(1 - width, 1, 40),
      new MeshBasicMaterial({ color: hex, transparent: true, opacity: 0, depthTest: false, side: DoubleSide }),
    );
    this.mesh.visible = false;
  }
  fire(x: number, y: number, z: number, r1 = 34, dur = 0.45): void {
    this.mesh.position.set(x, y, z);
    this.mesh.rotation.set(-Math.PI / 2, 0, 0);
    this.r1 = r1;
    this.dur = dur;
    this.t = 0;
  }
  update(dt: number): boolean {
    if (this.t < 0) return false;
    this.t += dt;
    const k = clamp(this.t / this.dur, 0, 1);
    const r = this.r0 + (this.r1 - this.r0) * (1 - Math.pow(1 - k, 2));
    this.mesh.scale.set(r, r, 1);
    this.mesh.material.opacity = 0.9 * (1 - k);
    this.mesh.visible = k < 1;
    if (k >= 1) this.t = -1;
    return true;
  }
  dispose(): void {
    this.mesh.geometry.dispose();
    this.mesh.material.dispose();
  }
}

/** 접촉 스파크 — 접점에서 방사형 짧은 선 n개 */
export class Sparks {
  readonly group = new Group();
  private items: Mesh<PlaneGeometry, MeshBasicMaterial>[] = [];
  private t = -1;
  constructor(hex: string, n = 6) {
    for (let i = 0; i < n; i++) {
      const m = new Mesh(new PlaneGeometry(10, 1.6), new MeshBasicMaterial({ color: hex, transparent: true, opacity: 0, depthTest: false, side: DoubleSide }));
      this.group.add(m);
      this.items.push(m);
    }
  }
  fire(x: number, y: number, z: number): void {
    this.group.position.set(x, y, z);
    this.t = 0;
  }
  update(dt: number): boolean {
    if (this.t < 0) return false;
    this.t += dt;
    const k = clamp(this.t / 0.32, 0, 1);
    this.items.forEach((m, i) => {
      const a = (i / this.items.length) * Math.PI * 2 + 0.3;
      const r = 8 + 26 * (1 - Math.pow(1 - k, 3));
      m.position.set(Math.cos(a) * r, 0, Math.sin(a) * r);
      m.rotation.set(-Math.PI / 2, 0, -a);
      m.scale.set(1 - k * 0.6, 1, 1);
      m.material.opacity = 1 - k;
    });
    if (k >= 1) this.t = -1;
    return true;
  }
  dispose(): void {
    for (const m of this.items) {
      m.geometry.dispose();
      m.material.dispose();
    }
  }
}

/** 지나간 자리에 남는 점 트레일 */
export class Trail {
  readonly group = new Group();
  private items: Mesh<CircleGeometry, MeshBasicMaterial>[] = [];
  private hist: [number, number, number][] = [];
  private acc = 0;
  constructor(
    n = 12,
    r = 1.4,
    hex = '#75634F',
    private opacity = 0.35,
  ) {
    for (let i = 0; i < n; i++) {
      const m = new Mesh(new CircleGeometry(r, 10).rotateX(-Math.PI / 2), new MeshBasicMaterial({ color: hex, transparent: true, opacity, depthTest: false, side: DoubleSide }));
      m.visible = false;
      this.group.add(m);
      this.items.push(m);
    }
  }
  push(x: number, y: number, z: number, dt: number, every = 0.045): void {
    this.acc += dt;
    if (this.acc < every) return;
    this.acc = 0;
    this.hist.unshift([x, y, z]);
    if (this.hist.length > this.items.length) this.hist.pop();
    this.items.forEach((m, i) => {
      const h = this.hist[i];
      if (!h) {
        m.visible = false;
        return;
      }
      m.visible = true;
      m.position.set(h[0], h[1], h[2]);
      const k = 1 - i / this.items.length;
      m.scale.setScalar(0.3 + 0.7 * k);
      m.material.opacity = this.opacity * k;
    });
  }
  clear(): void {
    this.hist = [];
    for (const m of this.items) m.visible = false;
  }
  dispose(): void {
    for (const m of this.items) {
      m.geometry.dispose();
      m.material.dispose();
    }
  }
}

/* ---------- 카메라 흔들림 (CameraRig가 읽는다) ---------- */
export const cameraShake = {
  amp: 0,
  /** px. 접촉 순간 호출 — 더 큰 값만 반영 */
  kick(amp: number): void {
    this.amp = Math.max(this.amp, amp);
    invalidate();
  },
  /** 프레임마다: 지터 오프셋을 돌려주고 감쇠 */
  step(dt: number): [number, number] {
    if (this.amp <= 0) return [0, 0];
    const j: [number, number] = [(Math.random() - 0.5) * 2 * this.amp, (Math.random() - 0.5) * 2 * this.amp];
    this.amp = Math.max(0, this.amp - dt * 18);
    return j;
  },
};
