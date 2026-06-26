import type { ExamType } from '../types';
import type { HealthCheckEngineType, HealthCheckType, HealthCheckTypeDefinition } from '../types/healthCheck';

export const HEALTH_CHECK_TYPES: HealthCheckTypeDefinition[] = [
  {
    id: 'urine',
    engineType: 'urine',
    label: '소변검사',
    shortLabel: '소변검사',
    description: '검사팀이 교실과 수업 장소를 방문하는 방식입니다.',
    operationMode: 'visit',
    isEnabled: true,
  },
  {
    id: 'tuberculosis',
    engineType: 'tb',
    label: '결핵검진',
    shortLabel: '결핵검진',
    description: '검진 대상 학급이 검진 장소로 이동하는 방식입니다.',
    operationMode: 'move',
    isEnabled: true,
  },
  {
    id: 'general',
    engineType: 'urine',
    label: '일반 건강검진',
    shortLabel: '일반 건강검진',
    description: '공통 건강검진 모듈로 관리하는 기본 방문형 검진입니다.',
    operationMode: 'visit',
    isEnabled: true,
  },
  {
    id: 'other',
    engineType: 'urine',
    label: '기타검진',
    shortLabel: '기타검진',
    description: '추가 검진 유형을 확장하기 위한 예비 타입입니다.',
    operationMode: 'visit',
    isEnabled: false,
  },
];

export function normalizeHealthCheckType(value: unknown): HealthCheckType {
  if (value === 'tb' || value === 'tuberculosis' || value === '결핵검진') return 'tuberculosis';
  if (value === 'general' || value === '일반 건강검진') return 'general';
  if (value === 'other' || value === '기타검진') return 'other';
  return 'urine';
}

export function getHealthCheckDefinition(checkType: HealthCheckType): HealthCheckTypeDefinition {
  return HEALTH_CHECK_TYPES.find((item) => item.id === checkType) ?? HEALTH_CHECK_TYPES[0];
}

export function getHealthCheckLabel(checkType: HealthCheckType) {
  return getHealthCheckDefinition(checkType).label;
}

export function getEngineType(checkType: HealthCheckType): HealthCheckEngineType {
  return getHealthCheckDefinition(checkType).engineType;
}

export function toExamType(checkType: HealthCheckType): ExamType {
  return getEngineType(checkType);
}

export function toHealthCheckType(examType: ExamType, fallback?: HealthCheckType): HealthCheckType {
  if (fallback) return normalizeHealthCheckType(fallback);
  return examType === 'tb' ? 'tuberculosis' : 'urine';
}
