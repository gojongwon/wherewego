import { describe, expect, it } from 'vitest';
import { OrthographicCamera, Vector3 } from 'three';
import { heightShear, orthoCamera } from './camera';

const W = 390;
const H = 844;

function build(pitch: number, shift = 0): OrthographicCamera {
  const c = orthoCamera(W, H, pitch, shift);
  const cam = new OrthographicCamera(c.left, c.right, c.top, c.bottom, c.near, c.far);
  cam.position.set(...c.position);
  cam.lookAt(...c.target);
  cam.updateMatrixWorld();
  cam.updateProjectionMatrix();
  return cam;
}

/** NDC → 화면 px (위가 0) */
function toScreen(ndc: Vector3): [number, number] {
  return [((ndc.x + 1) / 2) * W, ((1 - ndc.y) / 2) * H];
}

describe('orthoCamera — 지면↔화면 항등 매핑', () => {
  it.each([45, 55, 70])('피치 %d°: 지면 점 (x,0,z) → 화면 (x,z)', (pitch) => {
    const cam = build(pitch);
    for (const [x, z] of [
      [0, 0],
      [W, H],
      [195, 96],
      [195, 674],
      [40, 500],
    ]) {
      const [sx, sy] = toScreen(new Vector3(x, 0, z).project(cam));
      expect(sx).toBeCloseTo(x, 4);
      expect(sy).toBeCloseTo(z, 4);
    }
  });

  it('shiftY만큼 화면이 위로 밀린다 (translateY(-shiftY)와 등가)', () => {
    const cam = build(55, 120);
    const [, sy] = toScreen(new Vector3(195, 0, 500).project(cam));
    expect(sy).toBeCloseTo(500 - 120, 4);
  });

  it('높이 h는 화면 위로 h·cotθ px', () => {
    const pitch = 55;
    const cam = build(pitch);
    const [, ground] = toScreen(new Vector3(195, 0, 500).project(cam));
    const [, lifted] = toScreen(new Vector3(195, 10, 500).project(cam));
    expect(ground - lifted).toBeCloseTo(10 * heightShear(pitch), 4);
  });
});
