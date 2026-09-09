import { useRef, type PointerEvent, type ReactNode, type Ref } from 'react';
import './Sheet.css';

interface Props {
  open: boolean;
  children: ReactNode;
  /** 부모가 높이를 읽을 때 (App이 지도 시프트 계산에 사용) */
  ref?: Ref<HTMLElement>;
  onClose?: () => void;
}

const DISMISS = 96;

function setRef<T>(ref: Ref<T> | undefined, value: T | null) {
  if (!ref) return;
  if (typeof ref === 'function') ref(value);
  else ref.current = value;
}

/** 바텀시트 — 아래로 쓸면 닫힘 (핸들 드래그). */
export function Sheet({ open, children, ref, onClose }: Props) {
  const sheetRef = useRef<HTMLElement>(null);
  const drag = useRef({ y0: 0, dy: 0, on: false });

  const bind = (node: HTMLElement | null) => {
    sheetRef.current = node;
    setRef(ref, node);
  };

  const onDown = (e: PointerEvent<HTMLDivElement>) => {
    if (!onClose || !open) return;
    drag.current = { y0: e.clientY, dy: 0, on: true };
    e.currentTarget.setPointerCapture(e.pointerId);
    sheetRef.current?.classList.add('dragging');
  };

  const onMove = (e: PointerEvent<HTMLDivElement>) => {
    if (!drag.current.on || !sheetRef.current) return;
    const dy = Math.max(0, e.clientY - drag.current.y0);
    drag.current.dy = dy;
    sheetRef.current.style.transform = `translateY(${dy}px)`;
  };

  const onUp = () => {
    if (!drag.current.on || !sheetRef.current) return;
    drag.current.on = false;
    const el = sheetRef.current;
    el.classList.remove('dragging');
    if (onClose && drag.current.dy >= DISMISS) {
      el.style.transform = '';
      onClose();
      return;
    }
    el.style.transform = '';
  };

  return (
    <section ref={bind} className={open ? 'sheet show' : 'sheet'} aria-live="polite" aria-hidden={!open}>
      <div
        className="sheet-grip"
        data-testid="sheet-close"
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
      />
      {children}
    </section>
  );
}
