import type { HealthCheckSession, HealthCheckSessionStatus, HealthCheckType } from '../types/healthCheck';
import { getHealthCheckLabel, normalizeHealthCheckType } from './healthCheck';
import { storageAdapter } from './storage/localStorageAdapter';
import { ACTIVE_HEALTH_CHECK_SESSION_ID_KEY, HEALTH_CHECK_SESSIONS_KEY } from './storage/storageKeys';

export { ACTIVE_HEALTH_CHECK_SESSION_ID_KEY, HEALTH_CHECK_SESSIONS_KEY };

const SESSION_STATUSES: HealthCheckSessionStatus[] = ['draft', 'scheduled', 'inProgress', 'completed', 'archived'];

export function getHealthCheckSessions(): HealthCheckSession[] {
  try {
    const parsed = storageAdapter.getItem<Partial<HealthCheckSession>[]>(HEALTH_CHECK_SESSIONS_KEY) ?? [];
    return Array.isArray(parsed) ? parsed.map(normalizeSession).sort(compareSessions) : [];
  } catch {
    return [];
  }
}

export function saveHealthCheckSessions(sessions: HealthCheckSession[]) {
  storageAdapter.setItem(HEALTH_CHECK_SESSIONS_KEY, sessions.map(normalizeSession).sort(compareSessions));
}

export function createHealthCheckSession(input: {
  title: string;
  checkType: HealthCheckType;
  date: string;
  targetGrades: string[];
  location: string;
  status: HealthCheckSessionStatus;
}) {
  const now = new Date().toISOString();
  const checkType = normalizeHealthCheckType(input.checkType);
  const session: HealthCheckSession = {
    id: createSessionId(input.date, checkType, input.title),
    title: input.title.trim() || `${input.targetGrades.join('·')}학년 ${getHealthCheckLabel(checkType)}`,
    checkType,
    date: input.date,
    targetGrades: normalizeGrades(input.targetGrades),
    location: input.location.trim(),
    status: normalizeSessionStatus(input.status),
    createdAt: now,
    updatedAt: now,
  };
  const sessions = [...getHealthCheckSessions().filter((item) => item.id !== session.id), session];
  saveHealthCheckSessions(sessions);
  setActiveSessionId(session.id);
  return session;
}

export function updateHealthCheckSession(sessionId: string, patch: Partial<Omit<HealthCheckSession, 'id' | 'createdAt'>>) {
  const sessions = getHealthCheckSessions();
  const next = sessions.map((session) =>
    session.id === sessionId
      ? normalizeSession({
          ...session,
          ...patch,
          checkType: patch.checkType ? normalizeHealthCheckType(patch.checkType) : session.checkType,
          targetGrades: patch.targetGrades ? normalizeGrades(patch.targetGrades) : session.targetGrades,
          updatedAt: new Date().toISOString(),
        })
      : session,
  );
  saveHealthCheckSessions(next);
  return next.find((session) => session.id === sessionId);
}

export function deleteHealthCheckSession(sessionId: string) {
  const next = getHealthCheckSessions().filter((session) => session.id !== sessionId);
  saveHealthCheckSessions(next);
  if (getActiveSessionId() === sessionId) setActiveSessionId(next[0]?.id ?? '');
  return next;
}

export function getActiveSessionId() {
  return storageAdapter.getItem<string>(ACTIVE_HEALTH_CHECK_SESSION_ID_KEY) || '';
}

export function setActiveSessionId(sessionId: string) {
  if (!sessionId) storageAdapter.removeItem(ACTIVE_HEALTH_CHECK_SESSION_ID_KEY);
  else storageAdapter.setItem(ACTIVE_HEALTH_CHECK_SESSION_ID_KEY, sessionId);
}

export function getActiveSession() {
  const sessions = getHealthCheckSessions();
  const activeId = getActiveSessionId();
  return sessions.find((session) => session.id === activeId) ?? sessions[0];
}

export function createSessionStorageKey(kind: 'schedule' | 'students' | 'operation', sessionId: string) {
  return `schoolHealthHub.${kind}.${sessionId}`;
}

export function createSessionFromDefaults({
  checkType,
  date,
  targetGrades,
  location,
}: {
  checkType: HealthCheckType;
  date: string;
  targetGrades: string[];
  location: string;
}) {
  return createHealthCheckSession({
    title: `${normalizeGrades(targetGrades).join('·')}학년 ${getHealthCheckLabel(checkType)}`,
    checkType,
    date,
    targetGrades,
    location,
    status: 'draft',
  });
}

function normalizeSession(session: Partial<HealthCheckSession>): HealthCheckSession {
  const now = new Date().toISOString();
  const checkType = normalizeHealthCheckType(session.checkType);
  const targetGrades = normalizeGrades(session.targetGrades ?? []);
  const date = String(session.date || '');
  const title = String(session.title || `${targetGrades.join('·')}학년 ${getHealthCheckLabel(checkType)}`).trim();

  return {
    id: String(session.id || createSessionId(date, checkType, title)),
    title,
    checkType,
    date,
    targetGrades,
    location: String(session.location || ''),
    status: normalizeSessionStatus(session.status),
    createdAt: String(session.createdAt || now),
    updatedAt: String(session.updatedAt || session.createdAt || now),
  };
}

function normalizeSessionStatus(status: unknown): HealthCheckSessionStatus {
  return SESSION_STATUSES.includes(status as HealthCheckSessionStatus) ? (status as HealthCheckSessionStatus) : 'draft';
}

function normalizeGrades(grades: string[]) {
  return [...new Set(grades.flatMap((grade) => String(grade).split(/,|·|\s/)).map((grade) => grade.trim()).filter(Boolean))].sort((a, b) =>
    a.localeCompare(b, 'ko', { numeric: true }),
  );
}

function createSessionId(date: string, checkType: HealthCheckType, title: string) {
  const datePart = String(date || new Date().toISOString().slice(0, 10)).replace(/-/g, '');
  const titlePart = String(title || getHealthCheckLabel(checkType)).replace(/[^0-9A-Za-z가-힣]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
  return `session_${datePart}_${checkType}_${titlePart || Date.now()}`;
}

function compareSessions(a: HealthCheckSession, b: HealthCheckSession) {
  return b.date.localeCompare(a.date) || a.title.localeCompare(b.title, 'ko', { numeric: true });
}
