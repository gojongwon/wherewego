/**
 * 튜닝 파라미터 — 단일 출처. 설계서 §5.5 표와 1:1.
 * 값을 바꾸면 물리(shooter/physics.ts)와 판정(map/region.ts)이 함께 따라간다.
 */
export interface WindParams {
  /** px. 끝까지 쐈을 때(d=dMax) 밀리는 상한 */
  maxPx: number;
  /** 사거리 대비 잔여 난수 σ (HUD에 안 보이는 아주 작은 흔들림) */
  residualSigma: number;
  /** 초. 각도·세기 주기 3개 (무리수 비율 → 반복 안 함) */
  periodsSec: readonly [number, number, number];
}

export interface EventParams {
  /** 무풍일 때 발사당 사건 확률. 바람이 셀수록 rateWindy로 내려간다 */
  rate: number;
  /** 최대 바람일 때 사건 확률 */
  rateWindy: number;
  /** 비행 τ에서 사건이 일어나는 구간 */
  atRange: readonly [number, number];
  /** ms. 사건이 있으면 비행 시간에 더함 */
  extraMs: number;
  /** 종류별 킥 크기 / 사거리 */
  kick: { plane: number; finger: number; gull: number; gust: number };
  /** |kick| 상한 / 사거리 */
  maxKick: number;
}

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
  wind: WindParams;
  events: EventParams;
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
  // 당김 150px에서 최대 사거리 — 활 근처에서 시작해도 지도 북단까지 닿는다 (전 170)
  pMax: 150,
  gamma: 1.2,
  dMinPx: 50,
  // 지도 북단 위로 넘어갈 수 있는 여유 — 동북·서북 모서리까지 조준 범위를 넓힘 (전 40)
  overshootPx: 80,
  wind: { maxPx: 60, residualSigma: 0.01, periodsSec: [7, 2.9, 5.3] },
  events: {
    rate: 0.55,
    rateWindy: 0.1,
    atRange: [0.40, 0.52],
    extraMs: 800,
    kick: { plane: 0.09, finger: 0.07, gull: 0.06, gust: 0.08 },
    maxKick: 0.12,
  },
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
  mapTop: 72,
  /** 화면 하단에서 앵커까지 거리 (당길 공간 ≈ 170px 확보) */
  anchorFromBottom: 170,
  /** 앵커 위 지도 하한 여백 — 각궁(폭 ≈144px) + 장전 화살(앵커 앞 39px)이 제주를 가리지 않을 만큼 */
  mapBottomGap: 70,
  /** 위 값의 compact(짧은 화면)판 */
  mapBottomGapCompact: 52,
  /** 활 아래 힌트 위치 (앵커 기준 px) */
  hintBelowAnchor: 64,
  /** 바람 칩 위치 (앵커 기준 px) — 활 오른쪽 옆 */
  windChipOffset: [84, -14] as readonly [number, number],
  /** 지도 좌우 패딩 */
  mapPad: 18,
  /** 데스크톱에서 세로 스테이지 최대 폭 */
  stageMaxWidth: 430,
  /** 착지 → 결과 시트까지 지연 */
  resultDelayMs: 420,
  /** 이 높이 미만이면 하단 당김 공간을 줄여 지도를 키운다 (폰·짧은 창) */
  compactBelow: 1000,
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
  /** 시도 경계·해안 fat line 굵기 (px). 시군구 선은 1px 고정 */
  sidoEdgePx: 1.6,
} as const;
