import { getStudentSummary, STUDENT_STATUS_LABELS } from '../../lib/roster';
import type { HealthCheckStudent, HealthCheckStudentStatus } from '../../types/healthCheck';

const summaryStatuses: HealthCheckStudentStatus[] = ['pending', 'completed', 'absent', 'earlyLeave', 'late', 'deferred'];

export function StudentStatusSummary({ students }: { students: HealthCheckStudent[] }) {
  const summary = getStudentSummary(students);

  return (
    <section className="card student-status-summary">
      <div>
        <p className="eyebrow">미검 현황</p>
        <h2>학생 검진 집계</h2>
      </div>
      <div className="student-summary-grid">
        <SummaryMetric label="전체 대상자 수" value={summary.total} />
        <SummaryMetric label="완료자 수" value={summary.completed} />
        <SummaryMetric label="미검자 수" value={summary.incomplete} tone={summary.incomplete ? 'warn' : 'normal'} />
        <SummaryMetric label="학급 수" value={summary.classCount} />
      </div>
      <div className="student-status-counts">
        {summaryStatuses.map((status) => (
          <span key={status}>
            {STUDENT_STATUS_LABELS[status]} <strong>{summary.byStatus[status]}</strong>
          </span>
        ))}
      </div>
    </section>
  );
}

function SummaryMetric({ label, value, tone = 'normal' }: { label: string; value: number; tone?: 'normal' | 'warn' }) {
  return (
    <div className={`student-summary-metric ${tone === 'warn' ? 'warn' : ''}`}>
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}
