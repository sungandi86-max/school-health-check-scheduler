import type { HealthCheckSession } from '../types/healthCheck';
import { getHealthCheckLabel } from './healthCheck';

export function buildTeacherDashboardUrl(origin = getCurrentOrigin()) {
  return `${origin}/teacher-dashboard`;
}

export function buildAdminDashboardUrl(origin = getCurrentOrigin()) {
  return `${origin}/admin-dashboard`;
}

export function buildReportUrl(origin = getCurrentOrigin()) {
  return `${origin}/report`;
}

export function buildLiroSchoolShareMessage({
  session,
  teacherDashboardUrl = buildTeacherDashboardUrl(),
}: {
  session?: HealthCheckSession;
  teacherDashboardUrl?: string;
} = {}) {
  const title = session?.title ? `${session.title}이 진행됩니다.` : '금일 학생건강검진이 진행됩니다.';
  const checkType = session ? `검사 종류: ${getHealthCheckLabel(session.checkType)}` : '';
  const date = session?.date ? `검진일: ${session.date}` : '';
  const location = session?.location ? `검진 장소: ${session.location}` : '';

  return [
    title,
    '',
    checkType,
    date,
    location,
    '',
    '고교학점제 이동수업으로 인해 학생들이 각 교실에 분산되어 있으므로,',
    '수업 중인 선생님께서는 아래 실시간 현황 링크를 확인하시고',
    '해당 학급 학생이 있는 경우 검진 장소로 이동할 수 있도록 안내 부탁드립니다.',
    '',
    '실시간 현황 링크:',
    teacherDashboardUrl,
    '',
    '※ 방송 안내를 최소화하기 위한 교사용 확인 화면입니다.',
    '※ 학생 개인정보가 포함될 수 있으므로 외부 공유를 금지합니다.',
  ].filter((line, index, lines) => line || lines[index - 1] !== '').join('\n');
}

export async function copyToClipboard(text: string) {
  await navigator.clipboard.writeText(text);
}

function getCurrentOrigin() {
  if (typeof window === 'undefined') return '';
  return window.location.origin;
}
