import type { HealthCheckType } from '../../types/healthCheck';

export const APP_STORAGE_KEY = 'urine-exam-room-scheduler:v1';
export const ACTIVE_HEALTH_CHECK_TYPE_KEY = 'health-check-scheduler:active-type';

export const HEALTH_CHECK_SESSIONS_KEY = 'schoolHealthHub.sessions';
export const ACTIVE_HEALTH_CHECK_SESSION_ID_KEY = 'schoolHealthHub.activeSessionId';

export const LEGACY_OPERATION_STORAGE_KEY = 'school-health-check-operation-v1';

export function getHealthCheckAppStorageKey(checkType: HealthCheckType) {
  return `health-check-scheduler:${checkType}:v1`;
}

export function getRosterStorageKey(checkType: HealthCheckType) {
  return `schoolHealthHub.students.${checkType}`;
}

export function getSessionRosterStorageKey(sessionId: string) {
  return `schoolHealthHub.students.${sessionId}`;
}

export function getOperationStorageKey(sessionId: string) {
  return `schoolHealthHub.operation.${sessionId}`;
}

export function getOperationLogStorageKey(sessionId: string) {
  return `schoolHealthHub.logs.${sessionId}`;
}

export function getReportNotesStorageKey(sessionId: string) {
  return `schoolHealthHub.reportNotes.${sessionId}`;
}
