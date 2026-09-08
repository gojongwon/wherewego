import { BufferGeometry, Color, DoubleSide, Float32BufferAttribute, MeshBasicMaterial } from 'three';
import { SCENE_COLORS } from './palette';

export const RIBBON_SAMPLES = 48;
const WIDTH = 3;
const ALPHA = 0.7;

export const RIBBON_MATERIAL = new MeshBasicMaterial({
  vertexColors: true,
  transparent: true,
  side: DoubleSide,
  depthWrite: false,
});

/**
 * 비행 궤적 리본 — 샘플 N개를 좌우로 벌린 삼각형 스트립. 버퍼는 한 번 할당하고 매 프레임 위치만 갱신.
 * 색 attribute는 rgba(itemSize 4) → 오래된 쪽이 투명해지는 그라디언트. 폭도 꼬리로 갈수록 0.
 */
export class Ribbon {
  readonly geometry = new BufferGeometry();
  private readonly pts: number[] = []; // [x,y,z,...] 최신이 뒤
  private readonly pos = new Float32Array(RIBBON_SAMPLES * 2 * 3);
  private readonly color = new Float32Array(RIBBON_SAMPLES * 2 * 4);
  private readonly tint = new Color(SCENE_COLORS.arrowAccent);

  constructor() {
    const idx: number[] = [];
    for (let i = 0; i + 1 < RIBBON_SAMPLES; i++) {
      const a = i * 2;
      idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
    this.geometry.setAttribute('position', new Float32BufferAttribute(this.pos, 3));
    this.geometry.setAttribute('color', new Float32BufferAttribute(this.color, 4));
    this.geometry.setIndex(idx);
    this.geometry.setDrawRange(0, 0);
  }

  reset(): void {
    this.pts.length = 0;
    this.geometry.setDrawRange(0, 0);
  }

  push(x: number, y: number, z: number): void {
    this.pts.push(x, y, z);
    while (this.pts.length > RIBBON_SAMPLES * 3) this.pts.splice(0, 3);
    const n = this.pts.length / 3;
    const { r, g, b } = this.tint;
    // 스트립 정점 i·2, i·2+1 — 진행 방향에 수직(XZ 평면)으로 ±폭/2. 최신 샘플이 가장 넓고 진하다.
    for (let i = 0; i < n; i++) {
      const k = n > 1 ? i / (n - 1) : 1;
      this.color.set([r, g, b, ALPHA * k, r, g, b, ALPHA * k], i * 8);
      const px = this.pts[i * 3];
      const py = this.pts[i * 3 + 1];
      const pz = this.pts[i * 3 + 2];
      const j = i + 1 < n ? i + 1 : i - 1;
      let dx = j >= 0 ? this.pts[j * 3] - px : 1;
      let dz = j >= 0 ? this.pts[j * 3 + 2] - pz : 0;
      const len = Math.hypot(dx, dz) || 1;
      dx /= len;
      dz /= len;
      const w = WIDTH * k * 0.5;
      const o = i * 6;
      this.pos[o] = px - dz * w;
      this.pos[o + 1] = py;
      this.pos[o + 2] = pz + dx * w;
      this.pos[o + 3] = px + dz * w;
      this.pos[o + 4] = py;
      this.pos[o + 5] = pz - dx * w;
    }
    this.geometry.attributes.position.needsUpdate = true;
    this.geometry.attributes.color.needsUpdate = true;
    this.geometry.setDrawRange(0, Math.max(0, n - 1) * 6);
  }

  dispose(): void {
    this.geometry.dispose();
  }
}
