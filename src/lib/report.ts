import type { HealthCheckOperationLog, HealthCheckOperationState, HealthCheckSession, HealthCheckStudent, HealthCheckStudentStatus } from '../types/healthCheck';
import { getHealthCheckLabel } from './healthCheck';
import { formatOperationLogMessage } from './logs';
import { normalizeOperationClassId } from './operation';
import { getStudentSummary } from './roster';

export interface OperationReportSummary {
  session?: HealthCheckSession;
  notes: string;
  student: {
    total: number;
    completed: number;
    incomplete: number;
    byStatus: Record<HealthCheckStudentStatus, number>;
  };
  class: {
    total: number;
    completed: number;
    missingOccurred: number;
    delayedMinutes: number;
  };
  logs: HealthCheckOperationLog[];
}

export function getReportNotes(sessionId: string) {
  if (typeof localStorage === 'undefined') return '';
  return localStorage.getItem(getReportNotesStorageKey(sessionId)) ?? '';
}

export function saveReportNotes(sessionId: string, notes: string) {
  localStorage.setItem(getReportNotesStorageKey(sessionId), notes);
}

export function buildOperationReportSummary({
  session,
  state,
  students,
  logs,
  notes = '',
}: {
  session?: HealthCheckSession;
  state: HealthCheckOperationState;
  students: HealthCheckStudent[];
  logs: HealthCheckOperationLog[];
  notes?: string;
}): OperationReportSummary {
  const studentSummary = getStudentSummary(students);
  const classIds = [
    ...students.map((student) => student.className),
    state.currentClassId,
    state.nextClassId,
    ...state.completedClassIds,
    ...state.missingClassIds,
  ]
    .map(normalizeOperationClassId)
    .filter(Boolean);
  const missingOccurredClassIds = [
    ...state.missingClassIds,
    ...logs.filter((log) => log.type === 'classMissing').map((log) => log.relatedClassId || ''),
  ]
    .map(normalizeOperationClassId)
    .filter(Boolean);

  return {
    session,
    notes,
    student: {
      total: studentSummary.total,
      completed: studentSummary.completed,
      incomplete: studentSummary.incomplete,
      byStatus: studentSummary.byStatus,
    },
    class: {
      total: new Set(classIds).size,
      completed: new Set(state.completedClassIds.map(normalizeOperationClassId).filter(Boolean)).size,
      missingOccurred: new Set(missingOccurredClassIds).size,
      delayedMinutes: state.delayedMinutes,
    },
    logs,
  };
}

export function buildAdminReportText(summary: OperationReportSummary) {
  const session = summary.session;
  const dateText = session?.date ? formatReportDate(session.date) : '검진일 미지정';
  const title = session?.title || '선택된 검진';
  const checkType = session ? getHealthCheckLabel(session.checkType) : '건강검진';
  const targetGrades = session?.targetGrades.length ? `${session.targetGrades.join(', ')}학년` : '대상 학년 미지정';
  const logHighlights = summary.logs
    .filter((log) => ['classMissing', 'delayUpdated', 'manualNote', 'studentStatusChanged'].includes(log.type))
    .slice()
    .reverse()
    .slice(-5)
    .map(formatOperationLogMessage);

  return [
    `${dateText} 실시한 ${title} 운영 결과입니다.`,
    '',
    `검사 종류는 ${checkType}이며, 대상은 ${targetGrades}, 장소는 ${session?.location || '미지정'}입니다.`,
    `전체 대상자는 ${summary.student.total}명이며, 검진 완료자는 ${summary.student.completed}명, 미검자는 ${summary.student.incomplete}명입니다.`,
    `운영 중 미도착 학급 ${summary.class.missingOccurred}개, 지연 ${summary.class.delayedMinutes}분이 발생하였습니다.`,
    '',
    logHighlights.length ? `주요 운영 기록:\n${logHighlights.map((item) => `- ${item}`).join('\n')}` : '주요 운영 기록은 아직 없습니다.',
    '',
    summary.notes ? `개선 필요사항:\n${summary.notes}` : '개선 필요사항은 추후 입력 예정입니다.',
  ].join('\n');
}

export async function copyTextToClipboard(text: string) {
  await navigator.clipboard.writeText(text);
}

export function getReportNotesStorageKey(sessionId: string) {
  return `schoolHealthHub.reportNotes.${sessionId}`;
}

function formatReportDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' });
}
