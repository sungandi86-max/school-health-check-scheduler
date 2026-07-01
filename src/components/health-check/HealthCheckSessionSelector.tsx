import { useState } from 'react';
import type { HealthCheckSession, HealthCheckSessionStatus, HealthCheckType } from '../../types/healthCheck';
import { HealthCheckSessionBadge } from './HealthCheckSessionBadge';
import { HealthCheckSessionForm } from './HealthCheckSessionForm';
import { HealthCheckSessionList } from './HealthCheckSessionList';

export function HealthCheckSessionSelector({
  sessions,
  activeSession,
  defaultCheckType,
  defaultDate,
  defaultGrades,
  defaultLocation,
  onCreate,
  onSelect,
  onDelete,
  onStatusChange,
}: {
  sessions: HealthCheckSession[];
  activeSession?: HealthCheckSession;
  defaultCheckType: HealthCheckType;
  defaultDate: string;
  defaultGrades: string[];
  defaultLocation: string;
  onCreate: Parameters<typeof HealthCheckSessionForm>[0]['onSubmit'];
  onSelect: (sessionId: string) => void | Promise<void>;
  onDelete: (sessionId: string) => void | Promise<void>;
  onStatusChange: (sessionId: string, status: HealthCheckSessionStatus) => void | Promise<void>;
}) {
  const [open, setOpen] = useState(false);

  return (
    <section className="card session-selector">
      <div className="session-selector-header">
        <HealthCheckSessionBadge session={activeSession} onContinue={activeSession ? () => onSelect(activeSession.id) : undefined} />
        <button type="button" className="session-manage-button" onClick={() => setOpen((prev) => !prev)}>
          {open ? '세션 관리 닫기' : '세션 관리'}
        </button>
      </div>
      {open && (
        <div className="session-manager">
          <section className="session-create-panel" aria-label="새 검진 시작">
            <div className="session-panel-heading">
              <span>새 검진 시작</span>
              <strong>새 운영 세션 만들기</strong>
            </div>
            <HealthCheckSessionForm
              defaultCheckType={defaultCheckType}
              defaultDate={defaultDate}
              defaultGrades={defaultGrades}
              defaultLocation={defaultLocation}
              onSubmit={onCreate}
            />
          </section>
          <section className="session-list-panel" aria-label="기존 세션 선택">
            <div className="session-panel-heading">
              <span>기존 세션 선택</span>
              <strong>{sessions.length}개 세션</strong>
            </div>
            <HealthCheckSessionList
              sessions={sessions}
              activeSessionId={activeSession?.id ?? ''}
              onSelect={onSelect}
              onDelete={onDelete}
              onStatusChange={onStatusChange}
            />
          </section>
        </div>
      )}
    </section>
  );
}
