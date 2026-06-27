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
        <HealthCheckSessionBadge session={activeSession} />
        <button type="button" onClick={() => setOpen((prev) => !prev)}>{open ? '세션 관리 닫기' : '세션 관리'}</button>
      </div>
      {open && (
        <div className="session-manager">
          <HealthCheckSessionForm
            defaultCheckType={defaultCheckType}
            defaultDate={defaultDate}
            defaultGrades={defaultGrades}
            defaultLocation={defaultLocation}
            onSubmit={onCreate}
          />
          <HealthCheckSessionList
            sessions={sessions}
            activeSessionId={activeSession?.id ?? ''}
            onSelect={onSelect}
            onDelete={onDelete}
            onStatusChange={onStatusChange}
          />
        </div>
      )}
    </section>
  );
}
