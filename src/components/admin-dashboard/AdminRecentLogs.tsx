import type { HealthCheckOperationLog } from '../../types/healthCheck';
import { formatOperationLogMessage } from '../../lib/logs';

export function AdminRecentLogs({ logs }: { logs: HealthCheckOperationLog[] }) {
  const recentLogs = logs.slice(0, 5);

  return (
    <section className="admin-recent-logs">
      <div>
        <p className="eyebrow">운영 로그</p>
        <h2>최근 기록</h2>
      </div>
      <div className="admin-log-list">
        {recentLogs.length ? recentLogs.map((log) => (
          <article key={log.id}>
            <span>{formatOperationLogMessage(log)}</span>
          </article>
        )) : <p className="empty">아직 기록된 운영 로그가 없습니다. 운영센터에서 학급 시작, 완료, 미도착을 처리하면 여기에 표시됩니다.</p>}
      </div>
    </section>
  );
}
