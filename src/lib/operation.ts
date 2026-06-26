import type { ScheduleAssignment } from '../types';
import type { HealthCheckOperationState, HealthCheckOperationStatus, HealthCheckStudent, HealthCheckType } from '../types/healthCheck';
import { getHealthCheckLabel } from './healthCheck';

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

export function saveOperationState(state: OperationState): void;
export function saveOperationState(sessionId: string, state: HealthCheckOperationState): void;
export function saveOperationState(arg1: OperationState | string, arg2?: HealthCheckOperationState) {
  if (typeof arg1 === 'string') {
    localStorage.setItem(getOperationStorageKey(arg1), JSON.stringify(normalizeHealthCheckOperationState(arg1, arg2)));
    return;
  }
  localStorage.setItem(OPERATION_STORAGE_KEY, JSON.stringify({ ...arg1, lastUpdatedAt: new Date().toISOString() }));
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

export function getOperationState(sessionId: string): HealthCheckOperationState {
  if (typeof localStorage === 'undefined') return normalizeHealthCheckOperationState(sessionId);
  try {
    const parsed = JSON.parse(localStorage.getItem(getOperationStorageKey(sessionId)) || '{}') as Partial<HealthCheckOperationState>;
    return normalizeHealthCheckOperationState(sessionId, parsed);
  } catch {
    return normalizeHealthCheckOperationState(sessionId);
  }
}

export function setCurrentClass(state: HealthCheckOperationState, classId: string, classIds: string[] = []) {
  const normalizedClassId = normalizeOperationClassId(classId);
  const nextClassId = findNextClassId(normalizedClassId, classIds);
  return withNotice({
    ...state,
    currentClassId: normalizedClassId,
    nextClassId,
    missingClassIds: state.missingClassIds.filter((id) => id !== normalizedClassId),
    updatedAt: new Date().toISOString(),
  });
}

export function setClassCompleted(state: HealthCheckOperationState, classId: string, classIds: string[] = []) {
  const normalizedClassId = normalizeOperationClassId(classId);
  const completedClassIds = uniqueIds([...state.completedClassIds, normalizedClassId]);
  const nextClassId = findNextClassId(normalizedClassId, classIds);
  const currentClassId = state.currentClassId === normalizedClassId ? nextClassId : state.currentClassId;
  return withNotice({
    ...state,
    currentClassId,
    nextClassId: currentClassId ? findNextClassId(currentClassId, classIds) : nextClassId,
    completedClassIds,
    missingClassIds: state.missingClassIds.filter((id) => id !== normalizedClassId),
    updatedAt: new Date().toISOString(),
  });
}

export function setClassMissing(state: HealthCheckOperationState, classId: string) {
  const normalizedClassId = normalizeOperationClassId(classId);
  return withNotice({
    ...state,
    missingClassIds: uniqueIds([...state.missingClassIds, normalizedClassId]),
    updatedAt: new Date().toISOString(),
  });
}

export function clearClassMissing(state: HealthCheckOperationState, classId: string) {
  const normalizedClassId = normalizeOperationClassId(classId);
  return withNotice({
    ...state,
    missingClassIds: state.missingClassIds.filter((id) => id !== normalizedClassId),
    updatedAt: new Date().toISOString(),
  });
}

export function updateDelayedMinutes(state: HealthCheckOperationState, delayedMinutes: number) {
  return withNotice({
    ...state,
    delayedMinutes: Math.max(0, Number.isFinite(delayedMinutes) ? delayedMinutes : 0),
    updatedAt: new Date().toISOString(),
  });
}

export function updateOperationMemo(state: HealthCheckOperationState, operationMemo: string) {
  return {
    ...state,
    operationMemo,
    updatedAt: new Date().toISOString(),
  };
}

export function generateNoticeMessage(
  state: HealthCheckOperationState,
  options: { checkType?: HealthCheckType; location?: string } = {},
) {
  const checkLabel = options.checkType ? getHealthCheckLabel(options.checkType) : '검진';
  const lines = [
    state.currentClassId ? `현재 ${state.currentClassId} ${checkLabel}이 진행 중입니다.` : `현재 진행 중인 ${checkLabel} 학급이 지정되지 않았습니다.`,
    state.nextClassId ? `다음 검사 학급은 ${state.nextClassId}입니다.` : '다음 검사 학급은 아직 지정되지 않았습니다.',
    state.missingClassIds.length ? `${state.missingClassIds.join(', ')} 학생이 수업 중인 경우 검진 장소로 이동할 수 있도록 안내 부탁드립니다.` : '',
    state.delayedMinutes > 0 ? `현재 약 ${state.delayedMinutes}분 지연 중입니다.` : '',
    options.location ? `검진 장소: ${options.location}` : '',
  ];
  return lines.filter(Boolean).join('\n');
}

export function getOperationSummary(state: HealthCheckOperationState, classIds: string[]) {
  const uniqueClassIds = uniqueIds(classIds.map(normalizeOperationClassId).filter(Boolean));
  const completedClassIds = state.completedClassIds.filter((id) => uniqueClassIds.includes(id));
  const missingClassIds = state.missingClassIds.filter((id) => uniqueClassIds.includes(id));
  const totalClasses = uniqueClassIds.length;
  const completedClasses = completedClassIds.length;

  return {
    totalClasses,
    completedClasses,
    missingClasses: missingClassIds.length,
    progressPercent: totalClasses ? Math.round((completedClasses / totalClasses) * 100) : 0,
  };
}

export function getClassStudentStats(students: HealthCheckStudent[], classId: string) {
  const normalizedClassId = normalizeOperationClassId(classId);
  const classStudents = students.filter((student) => normalizeOperationClassId(student.className) === normalizedClassId);
  const completed = classStudents.filter((student) => student.status === 'completed').length;
  return {
    total: classStudents.length,
    completed,
    incomplete: classStudents.length - completed,
    hasRoster: classStudents.length > 0,
  };
}

export function normalizeOperationClassId(value: string) {
  const compact = String(value || '').replace(/\s/g, '').replace(/학년/g, '-').replace(/반/g, '');
  const dashed = compact.match(/([1-6])-(\d{1,2})/);
  if (dashed) return `${Number(dashed[1])}-${Number(dashed[2])}`;
  const mixed = compact.match(/([1-6])\D+(\d{1,2})/);
  if (mixed) return `${Number(mixed[1])}-${Number(mixed[2])}`;
  return compact;
}

export function getOperationStorageKey(sessionId: string) {
  return `schoolHealthHub.operation.${sessionId}`;
}

function normalizeHealthCheckOperationState(sessionId: string, state: Partial<HealthCheckOperationState> = {}): HealthCheckOperationState {
  return withNotice({
    sessionId,
    currentClassId: normalizeOperationClassId(state.currentClassId || ''),
    nextClassId: normalizeOperationClassId(state.nextClassId || ''),
    completedClassIds: uniqueIds(Array.isArray(state.completedClassIds) ? state.completedClassIds.map(normalizeOperationClassId) : []),
    missingClassIds: uniqueIds(Array.isArray(state.missingClassIds) ? state.missingClassIds.map(normalizeOperationClassId) : []),
    delayedMinutes: Math.max(0, Number(state.delayedMinutes) || 0),
    noticeMessage: String(state.noticeMessage || ''),
    operationMemo: String(state.operationMemo || ''),
    updatedAt: String(state.updatedAt || new Date().toISOString()),
  });
}

function withNotice(state: HealthCheckOperationState) {
  return {
    ...state,
    noticeMessage: generateNoticeMessage(state),
  };
}

function uniqueIds(ids: string[]) {
  return [...new Set(ids.map(normalizeOperationClassId).filter(Boolean))];
}

function findNextClassId(currentClassId: string, classIds: string[]) {
  const normalized = uniqueIds(classIds);
  const index = normalized.indexOf(currentClassId);
  return index >= 0 ? normalized[index + 1] ?? '' : normalized[0] ?? '';
}
