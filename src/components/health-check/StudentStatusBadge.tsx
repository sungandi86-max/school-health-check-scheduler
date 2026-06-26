import type { HealthCheckStudentStatus } from '../../types/healthCheck';
import { STUDENT_STATUS_LABELS } from '../../lib/roster';

export function StudentStatusBadge({ status }: { status: HealthCheckStudentStatus }) {
  return <span className={`student-status-badge status-${status}`}>{STUDENT_STATUS_LABELS[status]}</span>;
}
