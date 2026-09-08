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
  /** 정점에서 화살 확대 비율 */
  apexScale: number;
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
  apexScale: 1.4,
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
