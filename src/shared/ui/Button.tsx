import type { ComponentProps, ReactNode } from 'react';
import './Button.css';

interface Props extends ComponentProps<'button'> {
  variant?: 'primary' | 'ghost';
  /** 있으면 새 탭으로 여는 링크로 렌더 (딥링크용) */
  href?: string;
  children: ReactNode;
}

export function Button({ variant = 'ghost', href, className, children, ...rest }: Props) {
  const cls = ['btn', variant === 'primary' ? 'btn-primary' : '', className ?? ''].join(' ').trim();
  if (href) {
    return (
      <a className={cls} href={href} target="_blank" rel="noopener noreferrer">
        {children}
      </a>
    );
  }
  return (
    <button type="button" className={cls} {...rest}>
      {children}
    </button>
  );
}
