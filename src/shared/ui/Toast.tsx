import './Toast.css';

/** 하단 중앙 토스트. message가 null이면 숨김(show 클래스 토글). */
export function Toast({ message }: { message: string | null }) {
  return (
    <div className={message ? 'toast show' : 'toast'} role="status">
      {message}
    </div>
  );
}
