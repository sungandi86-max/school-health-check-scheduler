import { CalendarDays } from 'lucide-react';
import { getHealthCheckLabel } from '../../lib/healthCheck';
import type { HealthCheckSession, HealthCheckSessionStatus } from '../../types/healthCheck';

const STATUS_LABELS: Record<HealthCheckSessionStatus, string> = {
  draft: '초안',
  scheduled: '예정',
  inProgress: '진행중',
  completed: '완료',
  archived: '보관',
};

export function HealthCheckSessionBadge({ session }: { session?: HealthCheckSession }) {
  if (!session) {
    return (
      <div className="session-badge empty">
        <CalendarDays size={17} />
        <span>현재 세션 없음</span>
      </div>
    );
  }

  return (
    <div className="session-badge">
      <CalendarDays size={17} />
      <div>
        <span>현재 세션</span>
        <strong>{formatSessionTitle(session)}</strong>
      </div>
      <em>{STATUS_LABELS[session.status]}</em>
    </div>
  );
}

export function formatSessionTitle(session: HealthCheckSession) {
  const date = session.date ? session.date.replaceAll('-', '.') : '날짜 미정';
  return `${date} ${session.title || getHealthCheckLabel(session.checkType)}`;
}

export { STATUS_LABELS as HEALTH_CHECK_SESSION_STATUS_LABELS };
