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
        <span>운영 특이사항 / 개선 필요사항</span>
        <textarea
          value={notes}
          placeholder="검진 운영 중 특이사항, 확인 필요 학생 처리, 다음 검진 개선사항 등을 입력하세요."
          onChange={(event) => setNotes(event.target.value)}
        />
      </label>
      <div className="actions">
        <button type="button" className="primary" onClick={() => onSave(notes)}>
          운영 기록 저장
        </button>
      </div>
    </section>
  );
}
