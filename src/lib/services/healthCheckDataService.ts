import type {
  HealthCheckOperationLog,
  HealthCheckOperationState,
  HealthCheckSession,
  HealthCheckStudent,
  HealthCheckStudentStatus,
  HealthCheckType,
} from '../../types/healthCheck';
import type { HealthCheckOperationLogInput } from '../logs';
import {
  addOperationLog as addLocalOperationLog,
  clearOperationLogs as clearLocalOperationLogs,
  getOperationLogs as getLocalOperationLogs,
} from '../logs';
import {
  getOperationState as getLocalOperationState,
  saveOperationState as saveLocalOperationState,
} from '../operation';
import {
  getStudentsBySession as getLocalStudentsBySession,
  saveStudentsBySession as saveLocalStudentsBySession,
  updateStudentMemo as updateLocalStudentMemo,
  updateStudentStatus as updateLocalStudentStatus,
} from '../roster';
import {
  createHealthCheckSession as createLocalHealthCheckSession,
  deleteHealthCheckSession as deleteLocalHealthCheckSession,
  getHealthCheckSessions as getLocalHealthCheckSessions,
  updateHealthCheckSession as updateLocalHealthCheckSession,
} from '../sessions';
import { getStorageMode } from '../storage/storageProvider';
import {
  healthCheckSessionRepository,
} from '../repositories/HealthCheckSessionRepository';
import {
  createStudent,
  deleteStudent,
  getStudent,
  listStudents,
  replaceStudents,
  updateStudent,
} from '../repositories/HealthCheckStudentRepository';
import {
  deleteOperationState as deleteRemoteOperationState,
  getOperationState as getRemoteOperationState,
  updateOperationState as updateRemoteOperationState,
  upsertOperationState,
} from '../repositories/HealthCheckOperationStateRepository';
import {
  clearLogs as clearRemoteLogs,
  createLog,
  deleteLog,
  listLogs,
  listRecentLogs,
} from '../repositories/HealthCheckOperationLogRepository';

type CreateHealthCheckSessionInput = {
  title: string;
  checkType: HealthCheckType;
  date: string;
  targetGrades: string[];
  location: string;
  status: HealthCheckSession['status'];
};

type UpdateHealthCheckSessionInput = Partial<Omit<HealthCheckSession, 'id' | 'createdAt'>>;
type UpdateHealthCheckStudentInput = Partial<Omit<HealthCheckStudent, 'id' | 'sessionId'>>;
type UpdateHealthCheckOperationStateInput = Partial<Omit<HealthCheckOperationState, 'sessionId'>>;

function shouldUseSupabase() {
  return getStorageMode() === 'supabase';
}

function buildOperationLog(sessionId: string, input: HealthCheckOperationLogInput): HealthCheckOperationLog {
  return {
    ...input,
    id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    sessionId,
    createdAt: new Date().toISOString(),
  };
}

export const healthCheckDataService = {
  getStorageMode,

  async listSessions(): Promise<HealthCheckSession[]> {
    if (shouldUseSupabase()) return healthCheckSessionRepository.list();
    return getLocalHealthCheckSessions();
  },

  async getSession(sessionId: string): Promise<HealthCheckSession | undefined> {
    if (shouldUseSupabase()) return healthCheckSessionRepository.get(sessionId);
    return getLocalHealthCheckSessions().find((session) => session.id === sessionId);
  },

  async createSession(input: CreateHealthCheckSessionInput): Promise<HealthCheckSession> {
    if (shouldUseSupabase()) return healthCheckSessionRepository.create(input);
    return createLocalHealthCheckSession(input);
  },

  async updateSession(
    sessionId: string,
    patch: UpdateHealthCheckSessionInput,
  ): Promise<HealthCheckSession | undefined> {
    if (shouldUseSupabase()) return healthCheckSessionRepository.update(sessionId, patch);
    return updateLocalHealthCheckSession(sessionId, patch);
  },

  async deleteSession(sessionId: string): Promise<HealthCheckSession[]> {
    if (shouldUseSupabase()) return healthCheckSessionRepository.delete(sessionId);
    return deleteLocalHealthCheckSession(sessionId);
  },

  async listStudents(sessionId: string, checkType: HealthCheckType): Promise<HealthCheckStudent[]> {
    if (shouldUseSupabase()) {
      const students = await listStudents(sessionId);
      return students.filter((student) => student.checkType === checkType);
    }

    return getLocalStudentsBySession(sessionId, checkType);
  },

  async getStudent(studentId: string): Promise<HealthCheckStudent | null> {
    if (shouldUseSupabase()) return getStudent(studentId);
    return null;
  },

  async createStudent(student: HealthCheckStudent): Promise<HealthCheckStudent> {
    if (shouldUseSupabase()) return createStudent(student);
    const students = [...getLocalStudentsBySession(student.sessionId, student.checkType), student];
    saveLocalStudentsBySession(student.sessionId, student.checkType, students);
    return student;
  },

  async updateStudent(
    sessionId: string,
    checkType: HealthCheckType,
    studentId: string,
    patch: UpdateHealthCheckStudentInput,
  ): Promise<HealthCheckStudent | undefined> {
    if (shouldUseSupabase()) return updateStudent(studentId, patch);

    let students = getLocalStudentsBySession(sessionId, checkType);
    if (patch.status !== undefined) {
      students = updateLocalStudentStatus(students, studentId, patch.status);
    }
    if (patch.memo !== undefined) {
      students = updateLocalStudentMemo(students, studentId, patch.memo);
    }

    const next = students.map((student) =>
      student.id === studentId
        ? { ...student, ...patch, id: student.id, sessionId: student.sessionId }
        : student,
    );
    saveLocalStudentsBySession(sessionId, checkType, next);
    return next.find((student) => student.id === studentId);
  },

  async updateStudentStatus(
    sessionId: string,
    checkType: HealthCheckType,
    studentId: string,
    status: HealthCheckStudentStatus,
  ): Promise<HealthCheckStudent | undefined> {
    return this.updateStudent(sessionId, checkType, studentId, { status });
  },

  async updateStudentMemo(
    sessionId: string,
    checkType: HealthCheckType,
    studentId: string,
    memo: string,
  ): Promise<HealthCheckStudent | undefined> {
    return this.updateStudent(sessionId, checkType, studentId, { memo });
  },

  async deleteStudent(
    sessionId: string,
    checkType: HealthCheckType,
    studentId: string,
  ): Promise<void> {
    if (shouldUseSupabase()) {
      await deleteStudent(studentId);
      return;
    }

    const students = getLocalStudentsBySession(sessionId, checkType).filter(
      (student) => student.id !== studentId,
    );
    saveLocalStudentsBySession(sessionId, checkType, students);
  },

  async replaceStudents(
    sessionId: string,
    checkType: HealthCheckType,
    students: HealthCheckStudent[],
  ): Promise<HealthCheckStudent[]> {
    const nextStudents = students.map((student) => ({ ...student, sessionId, checkType }));
    if (shouldUseSupabase()) return replaceStudents(sessionId, nextStudents);

    saveLocalStudentsBySession(sessionId, checkType, nextStudents);
    return nextStudents;
  },

  async getOperationState(sessionId: string): Promise<HealthCheckOperationState | null> {
    if (shouldUseSupabase()) return getRemoteOperationState(sessionId);
    return getLocalOperationState(sessionId);
  },

  async saveOperationState(
    sessionId: string,
    state: HealthCheckOperationState,
  ): Promise<HealthCheckOperationState> {
    if (shouldUseSupabase()) return upsertOperationState(sessionId, state);

    const nextState = { ...state, sessionId };
    saveLocalOperationState(sessionId, nextState);
    return nextState;
  },

  async updateOperationState(
    sessionId: string,
    patch: UpdateHealthCheckOperationStateInput,
  ): Promise<HealthCheckOperationState> {
    if (shouldUseSupabase()) return updateRemoteOperationState(sessionId, patch);

    const current = getLocalOperationState(sessionId);
    const nextState = { ...current, ...patch, sessionId, updatedAt: new Date().toISOString() };
    saveLocalOperationState(sessionId, nextState);
    return nextState;
  },

  async deleteOperationState(sessionId: string): Promise<void> {
    if (shouldUseSupabase()) await deleteRemoteOperationState(sessionId);
  },

  async listLogs(sessionId: string): Promise<HealthCheckOperationLog[]> {
    if (shouldUseSupabase()) return listLogs(sessionId);
    return getLocalOperationLogs(sessionId);
  },

  async listRecentLogs(sessionId: string, limit: number): Promise<HealthCheckOperationLog[]> {
    if (shouldUseSupabase()) return listRecentLogs(sessionId, limit);
    return getLocalOperationLogs(sessionId).slice(0, Math.max(0, limit));
  },

  async createLog(
    sessionId: string,
    input: HealthCheckOperationLogInput,
  ): Promise<HealthCheckOperationLog> {
    if (shouldUseSupabase()) return createLog(buildOperationLog(sessionId, input));
    return addLocalOperationLog(sessionId, input);
  },

  async deleteLog(_sessionId: string, logId: string): Promise<void> {
    if (shouldUseSupabase()) await deleteLog(logId);
  },

  async clearLogs(sessionId: string): Promise<void> {
    if (shouldUseSupabase()) {
      await clearRemoteLogs(sessionId);
      return;
    }

    clearLocalOperationLogs(sessionId);
  },
};
