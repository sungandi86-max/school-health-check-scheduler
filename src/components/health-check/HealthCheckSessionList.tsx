import { Trash2 } from 'lucide-react';
import { getHealthCheckLabel } from '../../lib/healthCheck';
import type { HealthCheckSession, HealthCheckSessionStatus } from '../../types/healthCheck';
import { HEALTH_CHECK_SESSION_STATUS_LABELS } from './HealthCheckSessionBadge';

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
      {sessions.length === 0 && <p className="empty">선택된 세션이 없습니다. 먼저 검진 세션을 생성해 주세요.</p>}
      {sessions.map((session) => (
        <article className={`session-list-item ${session.id === activeSessionId ? 'active' : ''}`} key={session.id}>
          <button type="button" className="session-select-button" onClick={() => onSelect(session.id)}>
            <strong>{session.title}</strong>
            <span>{session.date || '날짜 미정'} / {getHealthCheckLabel(session.checkType)} / {session.targetGrades.join(', ') || '-'}학년</span>
            <span>{session.location || '장소 미정'}</span>
          </button>
          <select value={session.status} onChange={(event) => onStatusChange(session.id, event.target.value as HealthCheckSessionStatus)}>
            {Object.entries(HEALTH_CHECK_SESSION_STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
          <button type="button" title="세션 삭제" onClick={() => onDelete(session.id)}>
            <Trash2 size={16} />
          </button>
        </article>
      ))}
    </div>
  );
}
