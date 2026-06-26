import type { HealthCheckStudentStatus } from '../../types/healthCheck';
import { STUDENT_STATUS_LABELS } from '../../lib/roster';

const STATUS_ORDER: HealthCheckStudentStatus[] = ['pending', 'completed', 'absent', 'earlyLeave', 'late', 'deferred'];

export function AdminStudentStatusSummary({ byStatus }: { byStatus: Record<HealthCheckStudentStatus, number> }) {
  return (
    <section className="admin-student-status-summary">
      <div className="section-title compact">
        <div>
          <p className="eyebrow">학생 기준</p>
          <h2>학생 상태 요약</h2>
        </div>
      </div>
      <div className="admin-status-grid student">
        {STATUS_ORDER.map((status) => (
          <span key={status}>
            {STUDENT_STATUS_LABELS[status]} {byStatus[status] ?? 0}
          </span>
        ))}
      </div>
    </section>
  );
}
