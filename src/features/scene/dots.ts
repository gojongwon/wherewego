import { CircleGeometry, type InstancedMesh, MeshBasicMaterial, Object3D } from 'three';
import type { Point } from '@/shared/geo';

/** 오버레이 UI 높이 — 육지(0..D) 위에 그려지도록 depthTest 없이 이 높이에 둔다 */
export const OVERLAY_Y = 0.4;
export const DOT_SPACING = 9;
export const MAX_DOTS = 160;

export const DOT_GEOMETRY = new CircleGeometry(1.2, 10).rotateX(-Math.PI / 2);

export function overlayMaterial(hex: string, opacity = 1): MeshBasicMaterial {
  return new MeshBasicMaterial({ color: hex, transparent: true, opacity, depthTest: false });
}

const dummy = new Object3D();

/** a→b 점선을 InstancedMesh에 배치 (WebGL 점선 대체). 프레임마다 호출 가능. */
export function layoutDots(mesh: InstancedMesh, a: Point, b: Point, y = OVERLAY_Y, spacing = DOT_SPACING): void {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const len = Math.hypot(dx, dy);
  const n = Math.min(MAX_DOTS, Math.floor(len / spacing) + 1);
  for (let i = 0; i < n; i++) {
    const t = n > 1 ? i / (n - 1) : 0;
    dummy.position.set(a[0] + dx * t, y, a[1] + dy * t);
    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);
  }
  mesh.count = n;
  mesh.instanceMatrix.needsUpdate = true;
}
