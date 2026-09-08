/**
 * 기울어진 직교 카메라 — 지면↔화면 항등 매핑 (설계서 §4.5).
 * 월드 = 레이아웃 px: x→x, z→y(아래), y→높이. 프러스텀 높이를 H·sinθ로 두면
 * 지면 점 (x,0,z)가 화면 px (x, z−shiftY)에 정확히 놓이고, 높이 h는 화면 위로 h·cotθ px 만큼 시어된다.
 */
export interface CameraSpec {
  position: [number, number, number];
  target: [number, number, number];
  left: number;
  right: number;
  top: number;
  bottom: number;
  near: number;
  far: number;
}

export const CAMERA_DIST = 1500;

export function orthoCamera(width: number, height: number, pitchDeg: number, shiftY = 0): CameraSpec {
  const th = (pitchDeg * Math.PI) / 180;
  const target: [number, number, number] = [width / 2, 0, height / 2 + shiftY];
  return {
    position: [target[0], CAMERA_DIST * Math.sin(th), target[2] + CAMERA_DIST * Math.cos(th)],
    target,
    left: -width / 2,
    right: width / 2,
    top: (height * Math.sin(th)) / 2,
    bottom: -(height * Math.sin(th)) / 2,
    near: 1,
    far: 4000,
  };
}

/** 높이 1unit이 화면에서 위로 밀리는 px */
export const heightShear = (pitchDeg: number): number => 1 / Math.tan((pitchDeg * Math.PI) / 180);
