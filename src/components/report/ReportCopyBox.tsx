import { ClipboardCopy } from 'lucide-react';

export function ReportCopyBox({ text, onCopy }: { text: string; onCopy: () => void }) {
  return (
    <section className="report-card report-copy-box">
      <div className="section-title compact">
        <div>
          <p className="eyebrow">관리자 보고용 문구</p>
          <h2>자동 생성 보고 문안</h2>
        </div>
        <button type="button" onClick={onCopy}>
          <ClipboardCopy size={16} />
          복사
        </button>
      </div>
      <pre>{text}</pre>
    </section>
  );
}
