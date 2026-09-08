import type { ReactNode, Ref } from 'react';
import './Sheet.css';

interface Props {
  open: boolean;
  children: ReactNode;
  /** 부모가 높이를 읽을 때 (App이 지도 시프트 계산에 사용) */
  ref?: Ref<HTMLElement>;
}

/** 바텀시트 셸 — `show` 클래스 토글로 슬라이드. 내용은 children. */
export function Sheet({ open, children, ref }: Props) {
  return (
    <section ref={ref} className={open ? 'sheet show' : 'sheet'} aria-live="polite" aria-hidden={!open}>
      <div className="sheet-grip" />
      {children}
    </section>
  );
}
