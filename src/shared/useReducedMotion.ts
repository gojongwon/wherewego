import { useSyncExternalStore } from 'react';

const query = () => matchMedia('(prefers-reduced-motion: reduce)');

/** OS 모션 감소 설정 (설계서 §10.1). 비행·시프트·임팩트 연출이 이를 존중한다. */
export function useReducedMotion(): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const m = query();
      m.addEventListener('change', onChange);
      return () => m.removeEventListener('change', onChange);
    },
    () => query().matches,
    () => false,
  );
}
