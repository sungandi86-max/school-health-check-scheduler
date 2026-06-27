import { describe, expect, it } from 'vitest';
import type { HealthCheckSession } from '../types/healthCheck';
import { SCHOOL_SETTINGS_STORAGE_KEY } from './settings';
import { buildAdminDashboardUrl, buildLiroSchoolShareMessage, buildReportUrl, buildTeacherDashboardUrl } from './share';

const session: HealthCheckSession = {
  id: 'session-1',
  title: 'June check',
  checkType: 'tuberculosis',
  date: '2026-06-26',
  targetGrades: ['2', '3'],
  location: 'Central bus',
  status: 'scheduled',
  createdAt: '2026-06-01T00:00:00.000Z',
  updatedAt: '2026-06-01T00:00:00.000Z',
};

describe('share utilities', () => {
  it('builds dashboard URLs from an explicit origin', () => {
    expect(buildTeacherDashboardUrl('https://school.example')).toBe('https://school.example/teacher-dashboard');
    expect(buildAdminDashboardUrl('https://school.example')).toBe('https://school.example/admin-dashboard');
    expect(buildReportUrl('https://school.example')).toBe('https://school.example/report');
  });

  it('builds a LiroSchool share message with session and school settings', () => {
    window.localStorage.setItem(
      SCHOOL_SETTINGS_STORAGE_KEY,
      JSON.stringify({
        schoolName: 'Test High School',
        defaultLocation: 'Default venue',
        defaultNoticeMessage: 'Check the live dashboard.',
        contactInfo: 'Health office',
      }),
    );

    const message = buildLiroSchoolShareMessage({
      session,
      teacherDashboardUrl: 'https://school.example/teacher-dashboard',
    });

    expect(message).toContain('Test High School');
    expect(message).toContain('2026-06-26');
    expect(message).toContain('Central bus');
    expect(message).toContain('Health office');
    expect(message).toContain('https://school.example/teacher-dashboard');
  });
});
