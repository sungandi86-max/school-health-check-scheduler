import type { ExamOperationMode } from '../types';

export type HealthCheckType = 'urine' | 'tuberculosis' | 'general' | 'other';

export type HealthCheckEngineType = 'urine' | 'tb';

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
  checkType: HealthCheckType;
  examDate: string;
  title: string;
  scheduleItems: HealthCheckScheduleItem[];
  students: HealthCheckStudent[];
  operationStatus: HealthCheckOperationStatus;
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
  className: string;
  name: string;
  studentNumber?: string;
  checkedAt?: string;
  status: 'pending' | 'checked' | 'absent' | 'deferred';
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
