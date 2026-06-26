import type { ScheduleAssignment } from '../types';
import type { HealthCheckOperationStatus, HealthCheckType } from '../types/healthCheck';

export type StudentExamStatus = 'pending' | 'completed' | 'absent' | 'earlyLeave' | 'late' | 'deferred';
export type ScheduleRunStatus = 'waiting' | 'active' | 'completed' | 'missed';

export interface StudentRecord {
  id: string;
  grade: string;
  className: string;
  number: string;
  name: string;
  status: StudentExamStatus;
  memo: string;
}

export interface OperationScheduleItem {
  id: string;
  order: number;
  grade: string;
  className: string;
  unitName: string;
  callTime: string;
  examTime: string;
  endTime: string;
  venue: string;
  status: ScheduleRunStatus;
  note: string;
}

export interface OperationLogEntry {
  id: string;
  at: string;
  message: string;
}

export interface OperationState {
  title: string;
  examDate: string;
  roster: StudentRecord[];
  schedule: OperationScheduleItem[];
  currentScheduleId: string;
  delayMinutes: number;
  noticeMessage: string;
  logs: OperationLogEntry[];
  lastUpdatedAt: string;
}

export const OPERATION_STORAGE_KEY = 'school-health-check-operation-v1';

export const STUDENT_STATUS_LABELS: Record<StudentExamStatus, string> = {
  pending: '대기',
  completed: '완료',
  absent: '결석',
  earlyLeave: '조퇴',
  late: '지각',
  deferred: '추후검진',
};

export const SCHEDULE_STATUS_LABELS: Record<ScheduleRunStatus, string> = {
  waiting: '대기',
  active: '진행 중',
  completed: '완료',
  missed: '미도착',
};

export const DEFAULT_OPERATION_STATE: OperationState = {
  title: '학생 결핵검진 실시간 진행현황',
  examDate: '',
  roster: [],
  schedule: [],
  currentScheduleId: '',
  delayMinutes: 0,
  noticeMessage: '수업 중 해당 학급 학생이 있으면 검진 장소로 이동할 수 있도록 안내 부탁드립니다.',
  logs: [],
  lastUpdatedAt: '',
};

export function loadOperationState(): OperationState {
  try {
    const raw = localStorage.getItem(OPERATION_STORAGE_KEY);
    if (!raw) return { ...DEFAULT_OPERATION_STATE };
    const parsed = JSON.parse(raw) as Partial<OperationState>;
    return normalizeOperationState(parsed);
  } catch {
    return { ...DEFAULT_OPERATION_STATE };
  }
}

export function saveOperationState(state: OperationState) {
  localStorage.setItem(OPERATION_STORAGE_KEY, JSON.stringify({ ...state, lastUpdatedAt: new Date().toISOString() }));
}

export function normalizeOperationState(state: Partial<OperationState>): OperationState {
  return {
    ...DEFAULT_OPERATION_STATE,
    ...state,
    roster: Array.isArray(state.roster) ? state.roster : [],
    schedule: Array.isArray(state.schedule) ? state.schedule : [],
    logs: Array.isArray(state.logs) ? state.logs : [],
  };
}

export function addOperationLog(state: OperationState, message: string): OperationState {
  const entry: OperationLogEntry = {
    id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    at: new Date().toISOString(),
    message,
  };
  return { ...state, logs: [entry, ...state.logs].slice(0, 80) };
}

export function buildOperationSchedule(assignments: ScheduleAssignment[]): OperationScheduleItem[] {
  return assignments
    .filter((item) => item.order && !item.excluded)
    .slice()
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    .map((item) => ({
      id: item.id || `${item.order}-${item.unitName}-${item.scheduledTime}`,
      order: item.order ?? 0,
      grade: item.grade,
      className: normalizeClassName(item.unitName || item.homeRoomName || item.locationName),
      unitName: item.unitName || item.homeRoomName || item.locationName,
      callTime: item.callTime || item.scheduledTime || item.examTime || '',
      examTime: item.examTime || item.scheduledTime || '',
      endTime: addMinutes(item.examTime || item.scheduledTime || '', item.estimatedDurationMinutes ?? 5),
      venue: item.examVenue || '',
      status: 'waiting',
      note: item.note || '',
    }));
}

export function normalizeClassName(value: string): string {
  const text = String(value || '').trim();
  const match = text.match(/(\d+)\s*[-학년반]+\s*(\d+)/);
  if (match) return `${Number(match[1])}-${Number(match[2])}`;
  const short = text.match(/^(\d+)\s*[-]\s*(\d+)$/);
  if (short) return `${Number(short[1])}-${Number(short[2])}`;
  return text.replace(/학년/g, '-').replace(/반/g, '').replace(/--/g, '-').replace(/\s+/g, '').replace(/-$/, '');
}

export function addMinutes(time: string, minutes: number): string {
  if (!/^\d{1,2}:\d{2}$/.test(time)) return '';
  const [h, m] = time.split(':').map(Number);
  const total = h * 60 + m + minutes;
  const nextH = Math.floor(total / 60);
  const nextM = total % 60;
  return `${String(nextH).padStart(2, '0')}:${String(nextM).padStart(2, '0')}`;
}

export function formatDateTime(value: string): string {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('ko-KR', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
}

export function createOperationStatus(checkType: HealthCheckType, assignments: ScheduleAssignment[] = []): HealthCheckOperationStatus {
  const ordered = assignments
    .filter((item) => item.order)
    .sort((a, b) => (a.examTime || a.scheduledTime || '').localeCompare(b.examTime || b.scheduledTime || '') || (a.order ?? 0) - (b.order ?? 0));
  const current = ordered[0];
  const next = ordered[1];
  const last = ordered[ordered.length - 1];
  const pendingClasses = ordered.slice(current ? 1 : 0).map((item) => item.unitName || item.locationName).filter(Boolean);

  return {
    checkType,
    state: ordered.length ? 'in_progress' : 'ready',
    currentClass: current?.unitName || current?.locationName,
    nextClass: next?.unitName || next?.locationName,
    expectedEndTime: last?.examTime || last?.scheduledTime,
    completedClasses: [],
    pendingClasses,
    delayedClasses: assignments.filter((item) => item.failedReason).map((item) => item.unitName || item.locationName).filter(Boolean),
  };
}
