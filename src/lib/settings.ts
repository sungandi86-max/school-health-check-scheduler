import type { SchoolSettings } from '../types/settings';

export const SCHOOL_SETTINGS_STORAGE_KEY = 'schoolHealthHub.schoolSettings';

export const DEFAULT_SCHOOL_SETTINGS: SchoolSettings = {
  schoolName: '우리 학교',
  defaultHealthTeacherName: '',
  defaultLocation: '중앙현관 앞 검진버스',
  defaultStartTime: '08:10',
  defaultEndTime: '16:00',
  defaultMoveMinutes: 5,
  defaultBreakMinutes: 5,
  defaultNoticeMessage: '보건실에서 입력한 실시간 검진 현황을 확인해 주세요.',
  contactInfo: '',
  updatedAt: '',
};

export function createDefaultSchoolSettings(): SchoolSettings {
  return {
    ...DEFAULT_SCHOOL_SETTINGS,
    updatedAt: new Date().toISOString(),
  };
}

export function normalizeSchoolSettings(value: Partial<SchoolSettings> | null | undefined): SchoolSettings {
  return {
    ...createDefaultSchoolSettings(),
    ...value,
    defaultMoveMinutes: toNonNegativeNumber(value?.defaultMoveMinutes, DEFAULT_SCHOOL_SETTINGS.defaultMoveMinutes),
    defaultBreakMinutes: toNonNegativeNumber(value?.defaultBreakMinutes, DEFAULT_SCHOOL_SETTINGS.defaultBreakMinutes),
    updatedAt: value?.updatedAt || new Date().toISOString(),
  };
}

export function loadSchoolSettings(): SchoolSettings {
  if (typeof window === 'undefined') return createDefaultSchoolSettings();
  try {
    const raw = window.localStorage.getItem(SCHOOL_SETTINGS_STORAGE_KEY);
    if (!raw) return createDefaultSchoolSettings();
    return normalizeSchoolSettings(JSON.parse(raw) as Partial<SchoolSettings>);
  } catch (error) {
    console.warn('[settings] Failed to load school settings.', error);
    return createDefaultSchoolSettings();
  }
}

export function saveSchoolSettings(settings: SchoolSettings): SchoolSettings {
  const next = normalizeSchoolSettings({ ...settings, updatedAt: new Date().toISOString() });
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(SCHOOL_SETTINGS_STORAGE_KEY, JSON.stringify(next));
    } catch (error) {
      console.warn('[settings] Failed to save school settings.', error);
    }
  }
  return next;
}

export function resetSchoolSettings(): SchoolSettings {
  const next = createDefaultSchoolSettings();
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(SCHOOL_SETTINGS_STORAGE_KEY, JSON.stringify(next));
    } catch (error) {
      console.warn('[settings] Failed to reset school settings.', error);
    }
  }
  return next;
}

// TODO: Supabase 모드에서 학교 단위 설정을 공유해야 할 때 school_settings 테이블 Repository로 이전한다.
// TODO: 학교별 설정은 향후 Supabase Auth/PIN 기반 역할과 연결해 수정 권한을 제한한다.

function toNonNegativeNumber(value: unknown, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}
