import { useEffect, useState } from 'react';

export function ReportImprovementNotes({
  value,
  onSave,
}: {
  value: string;
  onSave: (notes: string) => void;
}) {
  const [notes, setNotes] = useState(value);

  useEffect(() => {
    setNotes(value);
  }, [value]);

  return (
    <section className="report-card report-notes-card">
      <label className="field">
        <span>특이사항 / 개선 필요사항</span>
        <textarea
          value={notes}
          placeholder="검진 운영 중 특이사항, 다음 해 개선 필요사항, 교사용 안내 개선점 등을 입력하세요."
          onChange={(event) => setNotes(event.target.value)}
        />
      </label>
      <div className="actions">
        <button type="button" className="primary" onClick={() => onSave(notes)}>
          개선사항 저장
        </button>
      </div>
    </section>
  );
}
