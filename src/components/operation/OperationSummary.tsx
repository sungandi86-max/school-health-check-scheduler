import type { HealthCheckOperationState } from '../../types/healthCheck';
import { getOperationSummary } from '../../lib/operation';

export function OperationSummary({ state, classIds }: { state: HealthCheckOperationState; classIds: string[] }) {
  const summary = getOperationSummary(state, classIds);

  return (
    <section className="card operation-summary-card">
      <div>
        <p className="eyebrow">운영 요약</p>
        <h2>학급 진행 현황</h2>
      </div>
      <div className="student-summary-grid">
        <Metric label="전체 학급" value={summary.totalClasses} />
        <Metric label="완료 학급" value={summary.completedClasses} tone="success" />
        <Metric label="미도착 학급" value={summary.missingClasses} tone={summary.missingClasses ? 'warn' : 'normal'} />
        <Metric label="진행률" value={`${summary.progressPercent}%`} />
      </div>
    </section>
  );
}

function Metric({ label, value, tone = 'normal' }: { label: string; value: number | string; tone?: 'normal' | 'warn' | 'success' }) {
  return (
    <div className={`student-summary-metric ${tone}`}>
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}
