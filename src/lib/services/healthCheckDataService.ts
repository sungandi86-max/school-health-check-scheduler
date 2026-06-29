import type {
  HealthCheckOperationLog,
  HealthCheckOperationLogType,
  HealthCheckOperationState,
  HealthCheckSession,
  HealthCheckStudent,
  HealthCheckStudentStatus,
  HealthCheckType,
} from '../../types/healthCheck';
import {
  addOperationLog as addLocalOperationLog,
  clearOperationLogs as clearLocalOperationLogs,
  getOperationLogs as getLocalOperationLogs,
  saveOperationLogs as saveLocalOperationLogs,
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
  createSessionFromDefaults as createLocalSessionFromDefaults,
  deleteHealthCheckSession as deleteLocalHealthCheckSession,
  getActiveSessionId as getLocalActiveSessionId,
  getHealthCheckSessions as getLocalHealthCheckSessions,
  setActiveSessionId as setLocalActiveSessionId,
  updateHealthCheckSession as updateLocalHealthCheckSession,
} from '../sessions';
import { healthCheckOperationLogRepository } from '../repositories/HealthCheckOperationLogRepository';
import { healthCheckOperationStateRepository } from '../repositories/HealthCheckOperationStateRepository';
import { healthCheckSessionRepository } from '../repositories/HealthCheckSessionRepository';
import { healthCheckStudentRepository } from '../repositories/HealthCheckStudentRepository';
import { getStorageMode } from '../storage/storageProvider';
import type { StorageMode } from '../storage/storageAdapter';

export type CreateHealthCheckSessionInput = {
  title: string;
  checkType: HealthCheckType;
  date: string;
  targetGrades: string[];
  location: string;
  status: HealthCheckSession['status'];
};

export type CreateHealthCheckSessionFromDefaultsInput = {
  checkType: HealthCheckType;
  date: string;
  targetGrades: string[];
  location: string;
};

export type UpdateHealthCheckSessionInput = Partial<Omit<HealthCheckSession, 'id' | 'createdAt'>>;
export type UpdateHealthCheckStudentInput = Partial<Omit<HealthCheckStudent, 'id' | 'sessionId'>>;
export type UpdateHealthCheckOperationStateInput = Partial<Omit<HealthCheckOperationState, 'sessionId'>>;
export type CreateHealthCheckOperationLogInput = {
  type: HealthCheckOperationLogType;
  message: string;
  relatedClassId?: string;
  relatedStudentId?: string;
};

type HealthCheckDataProvider = {
  mode: StorageMode;
  listSessions(): Promise<HealthCheckSession[]>;
  getActiveSessionId(): Promise<string>;
  setActiveSessionId(sessionId: string): Promise<void>;
  createSession(input: CreateHealthCheckSessionInput): Promise<HealthCheckSession>;
  createSessionFromDefaults(input: CreateHealthCheckSessionFromDefaultsInput): Promise<HealthCheckSession>;
  updateSession(sessionId: string, patch: UpdateHealthCheckSessionInput): Promise<HealthCheckSession | undefined>;
  deleteSession(sessionId: string): Promise<HealthCheckSession[]>;
  listStudents(sessionId: string, checkType: HealthCheckType): Promise<HealthCheckStudent[]>;
  replaceStudents(sessionId: string, checkType: HealthCheckType, students: HealthCheckStudent[]): Promise<HealthCheckStudent[]>;
  updateStudentStatus(sessionId: string, checkType: HealthCheckType, studentId: string, status: HealthCheckStudentStatus): Promise<HealthCheckStudent | undefined>;
  updateStudentMemo(sessionId: string, checkType: HealthCheckType, studentId: string, memo: string): Promise<HealthCheckStudent | undefined>;
  getOperationState(sessionId: string): Promise<HealthCheckOperationState>;
  saveOperationState(sessionId: string, state: HealthCheckOperationState): Promise<HealthCheckOperationState>;
  updateOperationState(sessionId: string, patch: UpdateHealthCheckOperationStateInput): Promise<HealthCheckOperationState>;
  listLogs(sessionId: string): Promise<HealthCheckOperationLog[]>;
  listRecentLogs(sessionId: string, limit: number): Promise<HealthCheckOperationLog[]>;
  createLog(sessionId: string, input: CreateHealthCheckOperationLogInput): Promise<HealthCheckOperationLog>;
  deleteLog(sessionId: string, logId: string): Promise<void>;
  clearLogs(sessionId: string): Promise<void>;
};

function isSupabaseMode() {
  return getStorageMode() === 'supabase';
}

function createOperationLog(sessionId: string, input: CreateHealthCheckOperationLogInput): HealthCheckOperationLog {
  return {
    id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    sessionId,
    createdAt: new Date().toISOString(),
    ...input,
  };
}

const localProvider: HealthCheckDataProvider = {
  mode: 'local',

  async listSessions() {
    return getLocalHealthCheckSessions();
  },

  async getActiveSessionId() {
    return getLocalActiveSessionId();
  },

  async setActiveSessionId(sessionId) {
    setLocalActiveSessionId(sessionId);
  },

  async createSession(input) {
    return createLocalHealthCheckSession(input);
  },

  async createSessionFromDefaults(input) {
    return createLocalSessionFromDefaults(input);
  },

  async updateSession(sessionId, patch) {
    return updateLocalHealthCheckSession(sessionId, patch);
  },

  async deleteSession(sessionId) {
    return deleteLocalHealthCheckSession(sessionId);
  },

  async listStudents(sessionId, checkType) {
    return getLocalStudentsBySession(sessionId, checkType);
  },

  async replaceStudents(sessionId, checkType, students) {
    const nextStudents = students.map((student) => ({ ...student, sessionId, checkType }));
    saveLocalStudentsBySession(sessionId, checkType, nextStudents);
    return nextStudents;
  },

  async updateStudentStatus(sessionId, checkType, studentId, status) {
    const students = updateLocalStudentStatus(getLocalStudentsBySession(sessionId, checkType), studentId, status);
    saveLocalStudentsBySession(sessionId, checkType, students);
    return students.find((student) => student.id === studentId);
  },

  async updateStudentMemo(sessionId, checkType, studentId, memo) {
    const students = updateLocalStudentMemo(getLocalStudentsBySession(sessionId, checkType), studentId, memo);
    saveLocalStudentsBySession(sessionId, checkType, students);
    return students.find((student) => student.id === studentId);
  },

  async getOperationState(sessionId) {
    return getLocalOperationState(sessionId);
  },

  async saveOperationState(sessionId, state) {
    const nextState = { ...state, sessionId };
    saveLocalOperationState(sessionId, nextState);
    return nextState;
  },

  async updateOperationState(sessionId, patch) {
    const nextState = { ...getLocalOperationState(sessionId), ...patch, sessionId, updatedAt: new Date().toISOString() };
    saveLocalOperationState(sessionId, nextState);
    return nextState;
  },

  async listLogs(sessionId) {
    return getLocalOperationLogs(sessionId);
  },

  async listRecentLogs(sessionId, limit) {
    return getLocalOperationLogs(sessionId).slice(0, Math.max(0, limit));
  },

  async createLog(sessionId, input) {
    return addLocalOperationLog(sessionId, input);
  },

  async deleteLog(sessionId, logId) {
    saveLocalOperationLogs(sessionId, getLocalOperationLogs(sessionId).filter((log) => log.id !== logId));
  },

  async clearLogs(sessionId) {
    clearLocalOperationLogs(sessionId);
  },
};

const supabaseProvider: HealthCheckDataProvider = {
  mode: 'supabase',

  listSessions: () => healthCheckSessionRepository.list(),
  getActiveSessionId: () => healthCheckSessionRepository.getActiveSessionId(),
  setActiveSessionId: (sessionId) => healthCheckSessionRepository.setActiveSessionId(sessionId),
  createSession: (input) => healthCheckSessionRepository.create(input),
  createSessionFromDefaults: (input) => healthCheckSessionRepository.createFromDefaults(input),
  updateSession: (sessionId, patch) => healthCheckSessionRepository.update(sessionId, patch),
  deleteSession: (sessionId) => healthCheckSessionRepository.delete(sessionId),

  async listStudents(sessionId, checkType) {
    const students = await healthCheckStudentRepository.listBySession(sessionId, checkType);
    return students;
  },

  replaceStudents: (sessionId, checkType, students) => healthCheckStudentRepository.replaceForSession(sessionId, checkType, students),
  updateStudentStatus: (sessionId, checkType, studentId, status) => healthCheckStudentRepository.updateStatus(sessionId, checkType, studentId, status),
  updateStudentMemo: (sessionId, checkType, studentId, memo) => healthCheckStudentRepository.updateMemo(sessionId, checkType, studentId, memo),

  getOperationState: (sessionId) => healthCheckOperationStateRepository.get(sessionId),
  saveOperationState: (sessionId, state) => healthCheckOperationStateRepository.save({ ...state, sessionId }),
  updateOperationState: (sessionId, patch) => healthCheckOperationStateRepository.update(sessionId, patch),

  listLogs: (sessionId) => healthCheckOperationLogRepository.listBySession(sessionId),
  listRecentLogs: (sessionId, limit) => healthCheckOperationLogRepository.recent(sessionId, limit),
  createLog: (sessionId, input) => healthCheckOperationLogRepository.add(sessionId, input),
  async deleteLog(sessionId, logId) {
    await healthCheckOperationLogRepository.delete(sessionId, logId);
  },
  async clearLogs(sessionId) {
    await healthCheckOperationLogRepository.clear(sessionId);
  },
};

export function getHealthCheckDataProvider(): HealthCheckDataProvider {
  return isSupabaseMode() ? supabaseProvider : localProvider;
}

export const healthCheckDataService: HealthCheckDataProvider = {
  get mode() {
    return getHealthCheckDataProvider().mode;
  },
  listSessions: () => getHealthCheckDataProvider().listSessions(),
  getActiveSessionId: () => getHealthCheckDataProvider().getActiveSessionId(),
  setActiveSessionId: (sessionId) => getHealthCheckDataProvider().setActiveSessionId(sessionId),
  createSession: (input) => getHealthCheckDataProvider().createSession(input),
  createSessionFromDefaults: (input) => getHealthCheckDataProvider().createSessionFromDefaults(input),
  updateSession: (sessionId, patch) => getHealthCheckDataProvider().updateSession(sessionId, patch),
  deleteSession: (sessionId) => getHealthCheckDataProvider().deleteSession(sessionId),
  listStudents: (sessionId, checkType) => getHealthCheckDataProvider().listStudents(sessionId, checkType),
  replaceStudents: (sessionId, checkType, students) => getHealthCheckDataProvider().replaceStudents(sessionId, checkType, students),
  updateStudentStatus: (sessionId, checkType, studentId, status) => getHealthCheckDataProvider().updateStudentStatus(sessionId, checkType, studentId, status),
  updateStudentMemo: (sessionId, checkType, studentId, memo) => getHealthCheckDataProvider().updateStudentMemo(sessionId, checkType, studentId, memo),
  getOperationState: (sessionId) => getHealthCheckDataProvider().getOperationState(sessionId),
  saveOperationState: (sessionId, state) => getHealthCheckDataProvider().saveOperationState(sessionId, state),
  updateOperationState: (sessionId, patch) => getHealthCheckDataProvider().updateOperationState(sessionId, patch),
  listLogs: (sessionId) => getHealthCheckDataProvider().listLogs(sessionId),
  listRecentLogs: (sessionId, limit) => getHealthCheckDataProvider().listRecentLogs(sessionId, limit),
  createLog: (sessionId, input) => getHealthCheckDataProvider().createLog(sessionId, input),
  deleteLog: (sessionId, logId) => getHealthCheckDataProvider().deleteLog(sessionId, logId),
  clearLogs: (sessionId) => getHealthCheckDataProvider().clearLogs(sessionId),
};

export { createOperationLog };
