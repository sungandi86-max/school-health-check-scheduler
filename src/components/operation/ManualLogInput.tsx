import { useState } from 'react';

export function ManualLogInput({ onAdd }: { onAdd: (message: string) => void }) {
  const [message, setMessage] = useState('');

  const submit = () => {
    const trimmed = message.trim();
    if (!trimmed) return;
    onAdd(trimmed);
    setMessage('');
  };

  return (
    <div className="manual-log-input">
      <label className="sr-only" htmlFor="manual-operation-log">운영 로그 직접 입력</label>
      <input
        id="manual-operation-log"
        value={message}
        placeholder="운영 중 특이사항을 입력하세요"
        aria-label="운영 로그 직접 입력"
        onChange={(event) => setMessage(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter') submit();
        }}
      />
      <button type="button" className="primary" aria-label="운영 로그 추가" onClick={submit}>
        기록 추가
      </button>
    </div>
  );
}
