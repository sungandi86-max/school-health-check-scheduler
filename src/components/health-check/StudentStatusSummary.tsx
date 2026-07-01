import { getStudentSummary } from '../../lib/roster';
import type { HealthCheckStudent, HealthCheckStudentStatus, HealthCheckType } from '../../types/healthCheck';
import { getStudentStatusCopy, getStudentStatusLabel } from './studentStatusCopy';

const summaryStatuses: HealthCheckStudentStatus[] = ['pending', 'completed', 'absent', 'earlyLeave', 'late', 'deferred'];

export function StudentStatusSummary({ students, checkType }: { students: HealthCheckStudent[]; checkType?: HealthCheckType }) {
  const summary = getStudentSummary(students);
  const statusCopy = getStudentStatusCopy(checkType);

  return (
    <section className="card student-status-summary">
      <div>
        <p className="eyebrow">명렬표 현황</p>
        <h2>학생 진행 현황</h2>
      </div>
      <div className="student-summary-grid">
        <SummaryMetric label="명렬표 인원" value={summary.total} tone="strong" />
        <SummaryMetric label={statusCopy.completedLabel} value={summary.completed} />
        <SummaryMetric label={statusCopy.incompleteLabel} value={summary.incomplete} tone={summary.incomplete ? 'warn' : 'normal'} />
        <SummaryMetric label="학급 수" value={summary.classCount} />
      </div>
      <div className="student-status-counts">
        {summaryStatuses.map((status) => (
          <span className={`status-${status}`} key={status}>
            {getStudentStatusLabel(status, checkType)} <strong>{summary.byStatus[status]}</strong>
          </span>
        ))}
      </div>
    </section>
  );
}

function SummaryMetric({ label, value, tone = 'normal' }: { label: string; value: number; tone?: 'normal' | 'warn' | 'strong' }) {
  return (
    <div className={`student-summary-metric ${tone === 'warn' ? 'warn' : ''} ${tone === 'strong' ? 'strong' : ''}`}>
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}
