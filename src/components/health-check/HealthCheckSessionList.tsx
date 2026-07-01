import { Trash2 } from 'lucide-react';
import { getHealthCheckLabel } from '../../lib/healthCheck';
import type { HealthCheckSession, HealthCheckSessionStatus } from '../../types/healthCheck';
import { formatSessionUpdatedAt, HEALTH_CHECK_SESSION_STATUS_LABELS } from './HealthCheckSessionBadge';

export function HealthCheckSessionList({
  sessions,
  activeSessionId,
  onSelect,
  onDelete,
  onStatusChange,
}: {
  sessions: HealthCheckSession[];
  activeSessionId: string;
  onSelect: (sessionId: string) => void | Promise<void>;
  onDelete: (sessionId: string) => void | Promise<void>;
  onStatusChange: (sessionId: string, status: HealthCheckSessionStatus) => void | Promise<void>;
}) {
  return (
    <div className="session-list">
      {sessions.length === 0 && <p className="empty">먼저 검진 세션을 만들어 주세요. 세션을 만들면 검진일, 검사 종류, 대상 학년을 기준으로 운영 데이터를 관리할 수 있습니다.</p>}
      {sessions.map((session) => (
        <article className={`session-list-item ${session.id === activeSessionId ? 'active' : ''}`} key={session.id}>
          <button type="button" className="session-select-button" onClick={() => onSelect(session.id)}>
            <span className="session-list-title-row">
              <strong>{session.title || getHealthCheckLabel(session.checkType)}</strong>
              <em className={`session-status-badge is-${session.status}`}>{HEALTH_CHECK_SESSION_STATUS_LABELS[session.status]}</em>
            </span>
            <span>{session.date || '날짜 미정'} / {getHealthCheckLabel(session.checkType)} / {session.targetGrades.join(', ') || '-'}학년</span>
            <span>{session.location || '장소 미정'}</span>
            <small>마지막 수정 {formatSessionUpdatedAt(session)}</small>
          </button>
          <div className="session-list-actions">
            <select value={session.status} onChange={(event) => onStatusChange(session.id, event.target.value as HealthCheckSessionStatus)}>
              {Object.entries(HEALTH_CHECK_SESSION_STATUS_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
            <button type="button" title="세션 삭제" aria-label={`${session.title} 세션 삭제`} onClick={() => onDelete(session.id)}>
              <Trash2 size={16} />
            </button>
          </div>
        </article>
      ))}
    </div>
  );
}
