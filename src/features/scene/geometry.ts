import { Shape } from 'three';

/**
 * Shape 좌표계 = (x, −y). ExtrudeGeometry 후 rotateX(−π/2)를 적용하면 월드 (x, 0..depth, y)가 된다.
 * 즉 레이아웃 px (x, y)를 shape에 넣을 때 y 부호만 뒤집는다.
 */
export function roundedRectShape(x: number, y: number, w: number, h: number, r: number): Shape {
  const s = new Shape();
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y);
  s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + h - r);
  s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h);
  s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r);
  s.quadraticCurveTo(x, y, x + r, y);
  return s;
}
