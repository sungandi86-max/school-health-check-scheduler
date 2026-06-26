import { ClipboardCopy } from 'lucide-react';

export function TeacherNoticeMessage({ message }: { message: string }) {
  const copy = () => {
    navigator.clipboard.writeText(message).then(() => alert('교사용 안내 문구를 복사했습니다.'));
  };

  return (
    <section className="teacher-notice-message">
      <div className="section-title compact">
        <div>
          <p className="eyebrow">교사용 안내문</p>
          <h2>리로스쿨/메신저 공유 문구</h2>
        </div>
        <button type="button" onClick={copy}>
          <ClipboardCopy size={16} />
          복사
        </button>
      </div>
      <p>{message || '보건실에서 입력한 안내 문구가 아직 없습니다.'}</p>
    </section>
  );
}
