import { useState } from 'react';
import type { HealthCheckOperationLog } from '../../types/healthCheck';
import { formatOperationLogMessage } from '../../lib/logs';
import { ManualLogInput } from './ManualLogInput';

export function OperationLogPanel({
  logs,
  onAddManualLog,
}: {
  logs: HealthCheckOperationLog[];
  onAddManualLog: (message: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const visibleLogs = expanded ? logs : logs.slice(0, 10);

  return (
    <section className="card operation-log-panel">
      <div className="section-title compact">
        <div>
          <p className="eyebrow">운영 로그</p>
          <h2>검진 운영 기록</h2>
        </div>
        {logs.length > 10 && (
          <button type="button" aria-label={expanded ? "최근 운영 로그 10개만 보기" : "전체 운영 로그 보기"} onClick={() => setExpanded((value) => !value)}>
            {expanded ? '최근 10개만' : '전체 로그 보기'}
          </button>
        )}
      </div>
      <ManualLogInput onAdd={onAddManualLog} />
      <div className="operation-log-list">
        {visibleLogs.length ? visibleLogs.map((log) => (
          <article key={log.id} className={`operation-log-item type-${log.type}`}>
            <span>{formatOperationLogMessage(log)}</span>
          </article>
        )) : <p className="empty">아직 기록된 운영 로그가 없습니다.</p>}
      </div>
    </section>
  );
}

