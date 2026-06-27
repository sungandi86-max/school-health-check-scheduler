import { describe, expect, it } from 'vitest';
import type { HealthCheckOperationState, HealthCheckStudent } from '../types/healthCheck';
import { getClassStudentStats, getOperationSummary, setClassCompleted, setClassMissing, updateDelayedMinutes } from './operation';

function createOperationState(overrides: Partial<HealthCheckOperationState> = {}): HealthCheckOperationState {
  return {
    sessionId: 'session-1',
    currentClassId: '',
    nextClassId: '',
    completedClassIds: [],
    missingClassIds: [],
    delayedMinutes: 0,
    noticeMessage: '',
    operationMemo: '',
    updatedAt: '2026-06-27T00:00:00.000Z',
    ...overrides,
  };
}

describe('operation summary utilities', () => {
  it('summarizes completed and missing classes with normalized class ids', () => {
    const state = createOperationState({
      completedClassIds: ['2-1', '2-2'],
      missingClassIds: ['2-3'],
    });

    expect(getOperationSummary(state, ['2-1', '2-2', '2-3', '2-4'])).toEqual({
      totalClasses: 4,
      completedClasses: 2,
      missingClasses: 1,
      progressPercent: 50,
    });
  });

  it('updates operation state when a class is completed or missing', () => {
    const state = createOperationState({ currentClassId: '2-1' });
    const completed = setClassCompleted(state, '2-1', ['2-1', '2-2']);
    const missing = setClassMissing(completed, '2-2');

    expect(completed.completedClassIds).toContain('2-1');
    expect(completed.currentClassId).toBe('2-2');
    expect(missing.missingClassIds).toContain('2-2');
  });

  it('calculates class-level student completion stats', () => {
    const students: HealthCheckStudent[] = [
      { id: '1', sessionId: 's1', checkType: 'urine', grade: '2', className: '2-1', number: '1', name: 'A', status: 'completed', memo: '', updatedAt: '' },
      { id: '2', sessionId: 's1', checkType: 'urine', grade: '2', className: '2-1', number: '2', name: 'B', status: 'pending', memo: '', updatedAt: '' },
      { id: '3', sessionId: 's1', checkType: 'urine', grade: '2', className: '2-2', number: '1', name: 'C', status: 'absent', memo: '', updatedAt: '' },
    ];

    expect(getClassStudentStats(students, '2-1')).toEqual({
      total: 2,
      completed: 1,
      incomplete: 1,
      hasRoster: true,
    });
  });

  it('normalizes invalid delay values to zero', () => {
    const next = updateDelayedMinutes(createOperationState(), Number.NaN);

    expect(next.delayedMinutes).toBe(0);
  });
});
