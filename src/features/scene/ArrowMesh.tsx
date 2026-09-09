import { BufferGeometry, Color, ConeGeometry, CylinderGeometry, DoubleSide, Float32BufferAttribute, MeshBasicMaterial, PlaneGeometry } from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { SCENE_COLORS } from './palette';

/** 화살 전체 길이 — SVG 심볼과 동일 (촉 끝 0, 샤프트 −58..0) */
export const ARROW_LENGTH = 58;

function paint(g: BufferGeometry, hex: string): BufferGeometry {
  const c = new Color(hex);
  const n = g.attributes.position.count;
  const colors = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) colors.set([c.r, c.g, c.b], i * 3);
  g.setAttribute('color', new Float32BufferAttribute(colors, 3));
  g.deleteAttribute('normal');
  g.deleteAttribute('uv');
  return g;
}

/**
 * 죽시(대나무 살) — 자작나무 빛 샤프트에 어두운 마디 두 개 + 원뿔 촉(오렌지) + 작은 십자 깃(잉크).
 * 로컬 +x가 진행 방향, 촉 끝이 원점. 모듈 로드 시 1회 생성해 장전·비행·핀·그림자가 공유한다.
 */
function buildArrow(): BufferGeometry {
  const shaft = new CylinderGeometry(1.15, 1.15, ARROW_LENGTH - 2, 8);
  shaft.rotateZ(Math.PI / 2);
  shaft.translate(-(ARROW_LENGTH - 2) / 2 - 1, 0, 0);

  // 마디 — 샤프트보다 살짝 굵은 짧은 띠
  const nodes = [-18, -38].map((x) => {
    const n = new CylinderGeometry(1.35, 1.35, 1.4, 8);
    n.rotateZ(Math.PI / 2);
    n.translate(x, 0, 0);
    return paint(n, SCENE_COLORS.arrowInk);
  });

  const head = new ConeGeometry(3.4, 11, 10);
  head.rotateZ(-Math.PI / 2); // +y → +x
  head.translate(-5.5, 0, 0);

  // 십자 깃 — 위에서 보면 수평 깃만 면으로 보이므로 작게
  const finV = new PlaneGeometry(9, 4);
  finV.translate(-(ARROW_LENGTH - 4.5), 0, 0);
  const finH = new PlaneGeometry(9, 4);
  finH.rotateX(Math.PI / 2);
  finH.translate(-(ARROW_LENGTH - 4.5), 0, 0);

  const merged = mergeGeometries(
    [paint(shaft, SCENE_COLORS.arrowShaft), ...nodes, paint(head, SCENE_COLORS.arrowAccent), paint(finV, SCENE_COLORS.arrowInk), paint(finH, SCENE_COLORS.arrowInk)],
    false,
  );
  if (!merged) throw new Error('arrow merge failed');
  return merged;
}

export const ARROW_GEOMETRY = buildArrow();
export const ARROW_MATERIAL = new MeshBasicMaterial({ vertexColors: true, side: DoubleSide });
/** 지면에 깔리는 그림자용 — 같은 지오메트리, 납작하게 스케일 */
export const ARROW_SHADOW_MATERIAL = new MeshBasicMaterial({
  color: SCENE_COLORS.shadow,
  transparent: true,
  opacity: SCENE_COLORS.shadowOpacity,
  depthTest: false,
});
