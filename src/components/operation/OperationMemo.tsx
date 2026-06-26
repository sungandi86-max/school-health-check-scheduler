import { useEffect, useState } from 'react';

export function OperationMemo({
  value,
  onSave,
}: {
  value: string;
  onSave: (memo: string) => void;
}) {
  const [memo, setMemo] = useState(value);

  useEffect(() => {
    setMemo(value);
  }, [value]);

  return (
    <section className="card operation-memo-card">
      <label className="field">
        <span>운영 메모</span>
        <textarea value={memo} placeholder="검진 운영 중 공유할 메모를 입력하세요." onChange={(event) => setMemo(event.target.value)} />
      </label>
      <div className="actions">
        <button type="button" className="primary" onClick={() => onSave(memo)}>메모 저장</button>
      </div>
    </section>
  );
}
