import type { LonLat } from '@/shared/geo';
import type { Hit } from '@/features/map';
import type { ShotGeometry } from '@/features/shooter';

/** 설계서 §3 상태 머신 */
export type Phase = 'IDLE' | 'AIMING' | 'FLYING' | 'LANDED' | 'RESULT';

export interface Shot {
  id: number;
  geometry: ShotGeometry;
  /** 판정 결과. pointerup 순간에 확정된다 (연출과 무관) */
  hit: Hit | null;
  /** 결과 좌표 (스냅됐으면 스냅 지점) */
  lonLat: LonLat;
  /** 조준점 대비 빗나간 거리 km (바람) */
  missKm: number;
  /** 공유 URL로 재현된 샷 — 비행·임팩트 없이 꽂힌 상태로 시작 */
  replay: boolean;
}

export type Hint =
  | { kind: 'idle' }
  | { kind: 'aiming'; percent: number }
  | { kind: 'deadzone' }
  | { kind: 'cancelled' }
  | { kind: 'none' };

export interface GameState {
  phase: Phase;
  shot: Shot | null;
  hint: Hint;
}

export type GameAction =
  | { type: 'AIM_START' }
  | { type: 'AIM_MOVE'; ratio: number; inDeadZone: boolean }
  | { type: 'AIM_CANCEL' }
  | { type: 'FIRE'; shot: Shot }
  | { type: 'LAND' }
  | { type: 'SHOW_RESULT' }
  | { type: 'REPLAY'; shot: Shot }
  | { type: 'RESET' };

export const initialState: GameState = { phase: 'IDLE', shot: null, hint: { kind: 'idle' } };

export function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'AIM_START':
      return state.phase === 'IDLE' ? { ...state, phase: 'AIMING', hint: { kind: 'deadzone' } } : state;
    case 'AIM_MOVE':
      if (state.phase !== 'AIMING') return state;
      return {
        ...state,
        hint: action.inDeadZone ? { kind: 'deadzone' } : { kind: 'aiming', percent: Math.round(action.ratio * 100) },
      };
    case 'AIM_CANCEL':
      return state.phase === 'AIMING' ? { ...state, phase: 'IDLE', hint: { kind: 'cancelled' } } : state;
    case 'FIRE':
      return state.phase === 'AIMING' ? { phase: 'FLYING', shot: action.shot, hint: { kind: 'none' } } : state;
    case 'LAND':
      return state.phase === 'FLYING' ? { ...state, phase: 'LANDED' } : state;
    case 'SHOW_RESULT':
      return state.phase === 'LANDED' ? { ...state, phase: 'RESULT' } : state;
    case 'REPLAY':
      // 공유 링크: 비행 없이 LANDED로 진입 → 마크 그리기 → RESULT
      return state.phase === 'IDLE' ? { phase: 'LANDED', shot: action.shot, hint: { kind: 'none' } } : state;
    case 'RESET':
      return { ...initialState };
    default:
      return state;
  }
}
