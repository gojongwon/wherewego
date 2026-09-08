/**
 * 튜닝 파라미터 — 단일 출처. 설계서 §5.5 표와 1:1.
 * 값을 바꾸면 물리(shooter/physics.ts)와 판정(map/region.ts)이 함께 따라간다.
 */
export interface GameParams {
  /** px. 이 미만으로 당기고 놓으면 취소 */
  deadZone: number;
  /** px. 최대 당김 (이 이상은 포화) */
  pMax: number;
  /** 당김→사거리 곡선 지수 (1 = 선형, ↑ 근거리 해상도↑) */
  gamma: number;
  /** px. 데드존 경계에서 놓았을 때의 사거리 (제주 남단 바로 아래) */
  dMinPx: number;
  /** px. 지도 북단 위로 넘어갈 수 있는 여유 */
  overshootPx: number;
  /** 사거리 대비 바람 편차 (정규분포 σ). 이 스케일에서 0.03 ≈ 15~20km */
  windSigma: number;
  /** km. 바다 착지 시 가장 가까운 해안 시군구로 스냅하는 허용 거리 */
  snapKm: number;
  /** ms. 비행 시간 (사거리 비례로 tMin..tMax) */
  tMin: number;
  tMax: number;
  /** 정점에서 화살 확대 비율 (직교 카메라라 원근 확대가 없어 약하게) */
  apexScale: number;
  /** 정점 높이 / 사거리 — 3D 아치 높이 (30..160 unit로 클램프) */
  apexRatio: number;
  /** 꽂힌 화살의 기울기(도) — 비행 마지막 피치도 여기로 수렴 */
  pinPitchDeg: number;
}

export const PARAMS: GameParams = {
  deadZone: 18,
  pMax: 170,
  gamma: 1.2,
  dMinPx: 50,
  overshootPx: 40,
  windSigma: 0.03,
  snapKm: 30,
  tMin: 650,
  tMax: 1200,
  apexScale: 0.35,
  apexRatio: 0.22,
  pinPitchDeg: 62,
};

/** 레이아웃 상수 (설계서 §4.1) */
export const LAYOUT = {
  /** HUD 아래, 지도 상한 */
  mapTop: 96,
  /** 화면 하단에서 앵커까지 거리 (당길 공간 ≈ 170px 확보) */
  anchorFromBottom: 170,
  /** 앵커 위 지도 하한 여백 */
  mapBottomGap: 40,
  /** 지도 좌우 패딩 */
  mapPad: 18,
  /** 데스크톱에서 세로 스테이지 최대 폭 */
  stageMaxWidth: 430,
  /** 착지 → 결과 시트까지 지연 */
  resultDelayMs: 420,
} as const;

/** 3D 씬 상수 */
export const SCENE = {
  /** 카메라 피치(도). 클수록 위에서 내려다봄 — 지면 매핑은 항등 유지, 높이 시어만 h·cotθ */
  pitchDeg: 55,
  /** 육지 extrude 두께 (world unit = px) */
  depth: 8,
  /** 캔버스 DPR 상한 (저사양 Android는 1.5) */
  maxDpr: 2,
  /** 맞은 시군구가 솟는 높이 */
  hitLift: 4,
} as const;
