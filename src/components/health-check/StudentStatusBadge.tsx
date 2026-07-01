import type { HealthCheckStudentStatus, HealthCheckType } from '../../types/healthCheck';
import { getStudentStatusLabel } from './studentStatusCopy';

export function StudentStatusBadge({ status, checkType }: { status: HealthCheckStudentStatus; checkType?: HealthCheckType }) {
  return <span className={`student-status-badge status-${status}`}>{getStudentStatusLabel(status, checkType)}</span>;
}
