import type { HealthCheckSession } from '../../types/healthCheck';
import { getHealthCheckLabel } from '../../lib/healthCheck';

export function AdminSessionInfo({ session }: { session?: HealthCheckSession }) {
  if (!session) {
    return (
      <section className="admin-session-info">
        <p className="eyebrow">현재 세션</p>
        <h2>선택된 검진 세션이 없습니다</h2>
        <p>운영센터 또는 세션 관리에서 오늘 진행할 검진 세션을 선택해 주세요.</p>
      </section>
    );
  }

  return (
    <section className="admin-session-info">
      <div>
        <p className="eyebrow">현재 세션</p>
        <h2>{session.title}</h2>
      </div>
      <dl>
        <div>
          <dt>검사 종류</dt>
          <dd>{getHealthCheckLabel(session.checkType)}</dd>
        </div>
        <div>
          <dt>날짜</dt>
          <dd>{formatDate(session.date)}</dd>
        </div>
        <div>
          <dt>장소</dt>
          <dd>{session.location || '-'}</dd>
        </div>
      </dl>
    </section>
  );
}

function formatDate(value: string) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' });
}
