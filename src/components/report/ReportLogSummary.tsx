import type { HealthCheckOperationLog } from '../../types/healthCheck';
import { formatOperationLogMessage } from '../../lib/logs';

export function ReportLogSummary({ logs }: { logs: HealthCheckOperationLog[] }) {
  const importantLogs = logs.filter((log) => ['classMissing', 'delayUpdated', 'manualNote', 'studentStatusChanged', 'classCompleted'].includes(log.type));

  return (
    <section className="report-card">
      <p className="eyebrow">운영 로그 요약</p>
      <h2>주요 운영 기록</h2>
      <div className="report-log-list">
        {importantLogs.length ? importantLogs.slice(0, 12).map((log) => (
          <article key={log.id}>
            <span>{formatOperationLogMessage(log)}</span>
          </article>
        )) : <p className="empty">요약할 운영 로그가 없습니다.</p>}
      </div>
    </section>
  );
}
