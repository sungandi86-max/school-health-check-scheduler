import type { HealthCheckOperationLog, HealthCheckOperationLogType } from '../types/healthCheck';
import { storageAdapter } from './storage/localStorageAdapter';
import { getOperationLogStorageKey } from './storage/storageKeys';

export interface HealthCheckOperationLogInput {
  type: HealthCheckOperationLogType;
  message: string;
  relatedClassId?: string;
  relatedStudentId?: string;
}

export function getOperationLogs(sessionId: string): HealthCheckOperationLog[] {
  try {
    const parsed = storageAdapter.getItem<Partial<HealthCheckOperationLog>[]>(getOperationLogStorageKey(sessionId)) ?? [];
    return Array.isArray(parsed)
      ? parsed.map((log) => normalizeOperationLog(sessionId, log)).sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      : [];
  } catch {
    return [];
  }
}

export function saveOperationLogs(sessionId: string, logs: HealthCheckOperationLog[]) {
  storageAdapter.setItem(getOperationLogStorageKey(sessionId), logs.map((log) => normalizeOperationLog(sessionId, log)));
}

export function addOperationLog(sessionId: string, logInput: HealthCheckOperationLogInput): HealthCheckOperationLog {
  const log = normalizeOperationLog(sessionId, {
    ...logInput,
    id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    sessionId,
    createdAt: new Date().toISOString(),
  });
  const logs = [log, ...getOperationLogs(sessionId)].slice(0, 500);
  saveOperationLogs(sessionId, logs);
  return log;
}

export function clearOperationLogs(sessionId: string) {
  storageAdapter.removeItem(getOperationLogStorageKey(sessionId));
}

export function formatOperationLogMessage(log: HealthCheckOperationLog) {
  const time = formatOperationLogTime(log.createdAt);
  return `${time} ${log.message}`;
}

export { getOperationLogStorageKey };

function normalizeOperationLog(sessionId: string, log: Partial<HealthCheckOperationLog>): HealthCheckOperationLog {
  return {
    id: String(log.id || `log-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`),
    sessionId: String(log.sessionId || sessionId),
    type: isOperationLogType(log.type) ? log.type : 'manualNote',
    message: String(log.message || ''),
    relatedClassId: log.relatedClassId ? String(log.relatedClassId) : undefined,
    relatedStudentId: log.relatedStudentId ? String(log.relatedStudentId) : undefined,
    createdAt: String(log.createdAt || new Date().toISOString()),
  };
}

function isOperationLogType(value: unknown): value is HealthCheckOperationLogType {
  return [
    'sessionStarted',
    'classStarted',
    'classCompleted',
    'classMissing',
    'classMissingCleared',
    'studentStatusChanged',
    'delayUpdated',
    'noticeGenerated',
    'memoUpdated',
    'manualNote',
  ].includes(String(value));
}

function formatOperationLogTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '--:--';
  return date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
}
