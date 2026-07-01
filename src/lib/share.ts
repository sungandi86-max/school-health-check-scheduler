import type { HealthCheckSession } from '../types/healthCheck';
import { getHealthCheckLabel } from './healthCheck';
import { loadSchoolSettings } from './settings';

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
  const schoolSettings = loadSchoolSettings();
  const location = session?.location || schoolSettings.defaultLocation;
  const detailLines = [
    `학교: ${schoolSettings.schoolName}`,
    session ? `검진 종류: ${getHealthCheckLabel(session.checkType)}` : '',
    session?.date ? `검진일: ${session.date}` : '',
    location ? `검진 장소: ${location}` : '',
    schoolSettings.contactInfo ? `문의: ${schoolSettings.contactInfo}` : '',
  ].filter(Boolean);

  return [
    `${schoolSettings.schoolName} 학교 별도검사가 진행됩니다.`,
    '',
    ...detailLines,
    detailLines.length ? '' : '',
    '고교학점제 이동수업으로 인해 학생들이 각 교실에 분산되어 있으므로,',
    '수업 중인 선생님께서는 아래 실시간 현황 링크를 확인하시고',
    '해당 학급 학생이 있는 경우 검진 장소로 이동할 수 있도록 안내 부탁드립니다.',
    '',
    '실시간 현황 링크:',
    teacherDashboardUrl,
    '',
    schoolSettings.defaultNoticeMessage ? `※ ${schoolSettings.defaultNoticeMessage}` : '',
    '※ 방송 안내를 최소화하기 위한 교사용 확인 화면입니다.',
    '※ 학생 개인정보가 포함될 수 있으므로 교직원 내부에서만 사용해 주세요.',
  ].filter((line, index, lines) => line || lines[index - 1] !== '').join('\n');
}

export async function copyToClipboard(text: string) {
  await navigator.clipboard.writeText(text);
}

function getCurrentOrigin() {
  if (typeof window === 'undefined') return '';
  return window.location.origin;
}
