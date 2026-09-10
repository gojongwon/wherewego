export type PlayMode = 'aim' | 'luck';

export const PLAY_MODES: readonly PlayMode[] = ['aim', 'luck'];

export const MODE_LABEL: Record<PlayMode, string> = {
  aim: '조준',
  luck: '운',
};

export const MODE_STORAGE_KEY = 'wwg-mode';

export const DEFAULT_PLAY_MODE: PlayMode = 'luck';

export function parsePlayMode(raw: string | null | undefined): PlayMode | null {
  return raw === 'aim' || raw === 'luck' ? raw : null;
}
