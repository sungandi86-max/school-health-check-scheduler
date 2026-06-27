import type { AccessModeInfo, UserRole } from '../types/auth';

export const ACCESS_MODES: Record<UserRole, AccessModeInfo> = {
  healthTeacher: {
    role: 'healthTeacher',
    label: '보건교사용 관리 화면',
    description: '이 화면은 보건실 운영 입력용입니다. 교사용 공유 링크로 배포하지 마세요.',
    isEditable: true,
  },
  teacher: {
    role: 'teacher',
    label: '교사용 확인 화면',
    description: '이 화면은 보건실에서 입력한 현황을 확인하는 보기 전용 화면입니다.',
    isEditable: false,
  },
  admin: {
    role: 'admin',
    label: '관리자 현황 화면',
    description: '전체 진행률, 미검 수, 운영 로그를 확인하는 보기 전용 요약 화면입니다.',
    isEditable: false,
  },
  viewer: {
    role: 'viewer',
    label: '운영 보고서 화면',
    description: '관리자 보고용으로 결과를 확인하고 복사하는 화면입니다.',
    isEditable: false,
  },
};

export function getAccessMode(role: UserRole) {
  return ACCESS_MODES[role];
}

// TODO: Supabase Auth 또는 PIN 기반 접근 제한을 도입할 때 이 역할 정보를 실제 인증 결과와 연결한다.
// TODO: 공유 링크에는 역할별 읽기/쓰기 권한 정책과 만료 시간을 적용한다.
