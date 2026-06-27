import { describe, expect, it } from 'vitest';
import {
  ACTIVE_HEALTH_CHECK_SESSION_ID_KEY,
  createHealthCheckSession,
  createSessionStorageKey,
  getActiveSessionId,
  getHealthCheckSessions,
  updateHealthCheckSession,
} from './sessions';

describe('health check session utilities', () => {
  it('creates stable session-scoped storage keys', () => {
    expect(createSessionStorageKey('students', 'session-1')).toBe('schoolHealthHub.students.session-1');
    expect(createSessionStorageKey('operation', 'session-1')).toBe('schoolHealthHub.operation.session-1');
  });

  it('creates a session and selects it as the active session', () => {
    const session = createHealthCheckSession({
      title: '2026 health check',
      checkType: 'tuberculosis',
      date: '2026-06-26',
      targetGrades: ['3', '2', '2'],
      location: 'Main hall',
      status: 'scheduled',
    });

    expect(session.checkType).toBe('tuberculosis');
    expect(session.targetGrades).toEqual(['2', '3']);
    expect(getActiveSessionId()).toBe(session.id);
    expect(window.localStorage.getItem(ACTIVE_HEALTH_CHECK_SESSION_ID_KEY)).toContain(session.id);
    expect(getHealthCheckSessions()).toHaveLength(1);
  });

  it('updates an existing session without changing its id', () => {
    const session = createHealthCheckSession({
      title: 'Draft check',
      checkType: 'urine',
      date: '2026-06-27',
      targetGrades: ['2'],
      location: 'Room A',
      status: 'draft',
    });

    const updated = updateHealthCheckSession(session.id, { status: 'inProgress', location: 'Room B' });

    expect(updated?.id).toBe(session.id);
    expect(updated?.status).toBe('inProgress');
    expect(updated?.location).toBe('Room B');
  });
});
