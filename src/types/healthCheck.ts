import type { ExamOperationMode } from '../types';

export type HealthCheckType = 'urine' | 'tuberculosis' | 'general' | 'other';

export type HealthCheckEngineType = 'urine' | 'tb';

export type HealthCheckStudentStatus = 'pending' | 'completed' | 'absent' | 'earlyLeave' | 'late' | 'deferred';

export type HealthCheckSessionStatus = 'draft' | 'scheduled' | 'inProgress' | 'completed' | 'archived';

export interface HealthCheckTypeDefinition {
  id: HealthCheckType;
  engineType: HealthCheckEngineType;
  label: string;
  shortLabel: string;
  description: string;
  operationMode: ExamOperationMode;
  isEnabled: boolean;
}

export interface HealthCheckSession {
  id: string;
  title: string;
  checkType: HealthCheckType;
  date: string;
  targetGrades: string[];
  location: string;
  status: HealthCheckSessionStatus;
  createdAt: string;
  updatedAt: string;
}

export interface HealthCheckScheduleItem {
  id: string;
  sessionId: string;
  className: string;
  grade: string;
  scheduledTime: string;
  expectedEndTime?: string;
  venue?: string;
  status: HealthCheckOperationStatus['state'];
}

export interface HealthCheckStudent {
  id: string;
  sessionId: string;
  checkType: HealthCheckType;
  grade: string;
  className: string;
  number: string;
  name: string;
  status: HealthCheckStudentStatus;
  memo: string;
  updatedAt: string;
}

export interface HealthCheckOperationStatus {
  checkType: HealthCheckType;
  state: 'ready' | 'in_progress' | 'completed' | 'delayed';
  currentClass?: string;
  nextClass?: string;
  expectedEndTime?: string;
  completedClasses: string[];
  pendingClasses: string[];
  delayedClasses: string[];
  memo?: string;
}
