import type { HealthCheckOperationLog } from '../../types/healthCheck';
import { formatOperationLogMessage } from '../../lib/logs';

export function AdminRecentLogs({ logs }: { logs: HealthCheckOperationLog[] }) {
  return (
    <section className="admin-recent-logs">
      <div>
        <p className="eyebrow">운영 로그</p>
        <h2>최근 주요 기록</h2>
      </div>
      <div className="admin-log-list">
        {logs.slice(0, 5).length ? logs.slice(0, 5).map((log) => (
          <article key={log.id}>
            <span>{formatOperationLogMessage(log)}</span>
          </article>
        )) : <p className="empty">아직 기록된 운영 로그가 없습니다.</p>}
      </div>
    </section>
  );
}
