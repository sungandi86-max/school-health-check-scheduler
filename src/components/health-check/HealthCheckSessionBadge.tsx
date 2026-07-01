import { CalendarDays } from 'lucide-react';
import { getHealthCheckLabel } from '../../lib/healthCheck';
import type { HealthCheckSession, HealthCheckSessionStatus } from '../../types/healthCheck';

const STATUS_LABELS: Record<HealthCheckSessionStatus, string> = {
  draft: '준비중',
  scheduled: '준비중',
  inProgress: '진행중',
  completed: '완료',
  archived: '보관',
};

export function HealthCheckSessionBadge({ session, onContinue }: { session?: HealthCheckSession; onContinue?: () => void }) {
  if (!session) {
    return (
      <div className="session-badge empty">
        <CalendarDays size={17} />
        <div>
          <span>최근 작업</span>
          <strong>선택된 세션 없음</strong>
          <small>새 검진을 시작하면 최근 작업이 여기에 표시됩니다.</small>
        </div>
      </div>
    );
  }

  return (
    <div className="session-badge">
      <CalendarDays size={17} />
      <div>
        <span>최근 작업</span>
        <strong>{session.title || getHealthCheckLabel(session.checkType)}</strong>
        <small>마지막 수정 {formatSessionUpdatedAt(session)}</small>
      </div>
      <em className={`session-status-badge is-${session.status}`}>{STATUS_LABELS[session.status]}</em>
      {onContinue && (
        <button type="button" className="session-continue-button" onClick={onContinue}>
          이어하기
        </button>
      )}
    </div>
  );
}

export function formatSessionTitle(session: HealthCheckSession) {
  const date = session.date ? session.date.replaceAll('-', '.') : '날짜 미정';
  return `${date} ${session.title || getHealthCheckLabel(session.checkType)}`;
}

function formatSessionDate(session: HealthCheckSession) {
  return session.date ? session.date.replaceAll('-', '.') : '날짜 미정';
}

export function formatSessionUpdatedAt(session: HealthCheckSession) {
  const value = session.updatedAt || session.createdAt;
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const pad = (part: number) => String(part).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export { STATUS_LABELS as HEALTH_CHECK_SESSION_STATUS_LABELS };
