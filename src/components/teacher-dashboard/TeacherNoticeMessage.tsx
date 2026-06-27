import { ClipboardCopy } from 'lucide-react';
import { useState } from 'react';

export function TeacherNoticeMessage({ message }: { message: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(message).then(() => {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    });
  };

  return (
    <section className="teacher-notice-message">
      <div className="section-title compact">
        <div>
          <p className="eyebrow">안내 문구</p>
          <h2>교사용 안내</h2>
        </div>
        <button type="button" aria-label="교사용 안내 문구 복사" onClick={copy}>
          <ClipboardCopy size={16} />
          {copied ? '복사되었습니다' : '안내 문구 복사'}
        </button>
      </div>
      <p>{message || '보건실에서 입력한 안내 문구가 아직 없습니다.'}</p>
    </section>
  );
}

