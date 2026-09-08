import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@/shared/tokens/tokens.css';
import '@/shared/ui';
import './design.css';
import { Design } from './Design';

// 로컬 전용 쇼케이스: http://localhost:5173/design — vite build 기본 input(index.html)에 포함되지 않는다.
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Design />
  </StrictMode>,
);
