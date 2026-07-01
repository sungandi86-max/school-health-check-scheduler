import { ClipboardCopy } from 'lucide-react';

export function NoticeMessageBox({ message, onCopy }: { message: string; onCopy?: () => void }) {
  const copy = () => {
    navigator.clipboard.writeText(message).then(() => {
      onCopy?.();
      alert('안내 문구를 복사했습니다.');
    });
  };

  return (
    <section className="card notice-message-card">
      <div className="section-title compact">
        <div>
          <p className="eyebrow">교사용 안내</p>
          <h2>자동 안내 문구</h2>
        </div>
        <button type="button" onClick={copy}>
          <ClipboardCopy size={16} />
          복사
        </button>
      </div>
      <div className="notice-message-box">
        <span>{message || '현재 안내할 운영 상태가 없습니다.'}</span>
      </div>
    </section>
  );
}
