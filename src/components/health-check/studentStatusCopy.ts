import type { HealthCheckStudentStatus, HealthCheckType } from '../../types/healthCheck';

type StudentStatusCopy = {
  completedLabel: string;
  incompleteLabel: string;
  statusLabels: Record<HealthCheckStudentStatus, string>;
};

const DEFAULT_STATUS_COPY: StudentStatusCopy = {
  completedLabel: '완료',
  incompleteLabel: '미완료',
  statusLabels: {
    pending: '미완료',
    completed: '완료',
    absent: '결석',
    earlyLeave: '확인 필요',
    late: '확인 필요',
    deferred: '확인 필요',
  },
};

const STATUS_COPY_BY_CHECK_TYPE: Partial<Record<HealthCheckType, StudentStatusCopy>> = {
  tuberculosis: {
    completedLabel: '완료',
    incompleteLabel: '미검진',
    statusLabels: {
      pending: '미검진',
      completed: '완료',
      absent: '결석',
      earlyLeave: '확인 필요',
      late: '확인 필요',
      deferred: '확인 필요',
    },
  },
  urine: {
    completedLabel: '제출 완료',
    incompleteLabel: '미제출',
    statusLabels: {
      pending: '미제출',
      completed: '제출 완료',
      absent: '결석',
      earlyLeave: '확인 필요',
      late: '확인 필요',
      deferred: '확인 필요',
    },
  },
};

export function getStudentStatusCopy(checkType?: HealthCheckType) {
  return STATUS_COPY_BY_CHECK_TYPE[checkType ?? 'other'] ?? DEFAULT_STATUS_COPY;
}

export function getStudentStatusLabel(status: HealthCheckStudentStatus, checkType?: HealthCheckType) {
  return getStudentStatusCopy(checkType).statusLabels[status];
}
