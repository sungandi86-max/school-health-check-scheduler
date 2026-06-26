import type { AppData, ExamType } from '../types';
import { createDefaultData } from './defaultData';
import { normalizeHealthCheckType, toExamType, toHealthCheckType } from './healthCheck';
import type { HealthCheckType } from '../types/healthCheck';
import { storageAdapter } from './storage/storageProvider';
import { ACTIVE_HEALTH_CHECK_TYPE_KEY, APP_STORAGE_KEY, getHealthCheckAppStorageKey } from './storage/storageKeys';

const STORAGE_KEY = APP_STORAGE_KEY;
export const APP_DATA_VERSION = '2026-06-health-check-scheduler-v3';
const REQUIRED_BLOCKED_KEYWORDS = ['스생'];
const MIXED_GRADE_NOTE = '혼합학년 수업 / 명렬표 확인 필요';

export function loadAppData(options: { startAtTypeSelect?: boolean } = {}): AppData {
  try {
    const activeType = normalizeHealthCheckType(storageAdapter.getItem<string>(ACTIVE_HEALTH_CHECK_TYPE_KEY));
    const parsed =
      storageAdapter.getItem<Partial<AppData> & { appDataVersion?: string }>(getHealthCheckStorageKey(activeType)) ??
      storageAdapter.getItem<Partial<AppData> & { appDataVersion?: string }>(STORAGE_KEY);
    if (!parsed) return createDefaultData();
    const fallback = createDefaultData();

    const settings = { ...fallback.settings, ...parsed.settings };
    settings.examType = normalizeExamType(settings.examType);
    settings.healthCheckType = normalizeHealthCheckType(settings.healthCheckType ?? parsed.healthCheckType ?? toHealthCheckType(settings.examType));
    settings.examType = toExamType(settings.healthCheckType);
    normalizeSettings(settings, fallback.settings);
    ensureRequiredBlockedKeywords(settings);
    const templates = Array.isArray(parsed.templates)
        ? parsed.templates.map((template) => ({
          ...template,
          examType: normalizeExamType(template.examType),
          healthCheckType: normalizeHealthCheckType(template.healthCheckType ?? template.data?.settings?.healthCheckType ?? toHealthCheckType(normalizeExamType(template.examType))),
          data: {
            ...template.data,
            restrictedVenues: normalizeRestrictedVenues(Array.isArray(template.data?.restrictedVenues) ? template.data.restrictedVenues : []),
            restrictedVenueEntries: normalizeRestrictedVenueEntries(Array.isArray(template.data?.restrictedVenueEntries) ? template.data.restrictedVenueEntries : []),
            restrictedVenueWeekday: normalizeRestrictedVenueWeekday(template.data?.restrictedVenueWeekday),
            roomMappings: normalizeRoomMappings(Array.isArray(template.data?.roomMappings) ? template.data.roomMappings : []),
            roomMappingSettings: template.data?.roomMappingSettings ?? { enabled: true },
            uploadedMappingFileNames: Array.isArray(template.data?.uploadedMappingFileNames) ? template.data.uploadedMappingFileNames : [],
            settings: {
              ...fallback.settings,
              ...template.data?.settings,
              healthCheckType: normalizeHealthCheckType(template.data?.settings?.healthCheckType ?? template.healthCheckType ?? toHealthCheckType(normalizeExamType(template.data?.settings?.examType ?? template.examType))),
              examType: toExamType(normalizeHealthCheckType(template.data?.settings?.healthCheckType ?? template.healthCheckType ?? toHealthCheckType(normalizeExamType(template.data?.settings?.examType ?? template.examType)))),
            },
          },
        }))
      : fallback.templates;
    const templateTypes = new Set(templates.map((template) => normalizeHealthCheckType(template.healthCheckType ?? template.examType)));
    for (const fallbackTemplate of fallback.templates) {
      if (!templateTypes.has(normalizeHealthCheckType(fallbackTemplate.healthCheckType ?? fallbackTemplate.examType))) templates.push(fallbackTemplate);
    }
    const urineDate = templates.find((template) => template.id === 'tpl-2026-urine')?.data.settings.examDate;
    const tbTemplate = templates.find((template) => template.id === 'tpl-2026-tb');
    if (tbTemplate && tbTemplate.data.settings.examDate === urineDate) {
      tbTemplate.data.settings.examDate = '2026-06-25';
    }
    templates.forEach((template) => {
      normalizeSettings(template.data.settings, fallback.settings);
      ensureRequiredBlockedKeywords(template.data.settings);
    });

    return {
      settings,
      locations: Array.isArray(parsed.locations) ? parsed.locations : fallback.locations,
      timetables: Array.isArray(parsed.timetables) ? parsed.timetables : fallback.timetables,
      divisions: Array.isArray(parsed.divisions) ? parsed.divisions : fallback.divisions,
      judgements: Array.isArray(parsed.judgements) ? parsed.judgements : [],
      assignments: Array.isArray(parsed.assignments) ? parsed.assignments : [],
      manualOverrides: Array.isArray(parsed.manualOverrides) ? parsed.manualOverrides : [],
      restrictedVenues: normalizeRestrictedVenues(Array.isArray(parsed.restrictedVenues) ? parsed.restrictedVenues : []),
      restrictedVenueEntries: normalizeRestrictedVenueEntries(Array.isArray(parsed.restrictedVenueEntries) ? parsed.restrictedVenueEntries : []),
      restrictedVenueWeekday: normalizeRestrictedVenueWeekday(parsed.restrictedVenueWeekday),
      roomMappings: normalizeRoomMappings(Array.isArray(parsed.roomMappings) ? parsed.roomMappings : []),
      roomMappingSettings: parsed.roomMappingSettings ?? { enabled: true },
      uploadedMappingFileNames: Array.isArray(parsed.uploadedMappingFileNames) ? parsed.uploadedMappingFileNames : [],
      templates,
      activeTemplateId: typeof parsed.activeTemplateId === 'string' ? parsed.activeTemplateId : fallback.activeTemplateId,
      healthCheckType: settings.healthCheckType,
      healthCheckSessions: Array.isArray(parsed.healthCheckSessions) ? parsed.healthCheckSessions : [],
      operationStatus: parsed.operationStatus,
      schoolDefaults: parsed.schoolDefaults?.daySchedule ? parsed.schoolDefaults : fallback.schoolDefaults,
      keywordSets: normalizeKeywordSets(parsed.keywordSets, fallback.keywordSets),
      appDataVersion: APP_DATA_VERSION,
      currentView: typeof parsed.currentView === 'string' ? parsed.currentView : undefined,
      hasSelectedExamType: options.startAtTypeSelect ? false : typeof parsed.hasSelectedExamType === 'boolean' ? parsed.hasSelectedExamType : false,
      needsReschedule: typeof parsed.needsReschedule === 'boolean' ? parsed.needsReschedule : false,
    };
  } catch {
    return createDefaultData();
  }
}

function normalizeRestrictedVenueWeekday(value: unknown): AppData['restrictedVenueWeekday'] {
  return ['auto', '월', '화', '수', '목', '금'].includes(String(value)) ? (value as AppData['restrictedVenueWeekday']) : 'auto';
}

function normalizeExamType(value: unknown): ExamType {
  return value === 'tb' || value === '결핵검진' ? 'tb' : 'urine';
}

function getHealthCheckStorageKey(checkType: HealthCheckType) {
  return getHealthCheckAppStorageKey(checkType);
}

function normalizeRoomMappings(mappings: AppData['roomMappings']): AppData['roomMappings'] {
  return mappings.map((mapping) => {
    const lectureRoomName = normalizeComprehensiveLectureRoom(mapping.actualRoom);
    if (lectureRoomName) {
      return {
        ...mapping,
        actualRoom: lectureRoomName,
        restroomAccessible: true,
        urineExamAvailability: '주의',
        reason: mapping.isMixedGrade ? mixedRoomReason(`${lectureRoomName} 수업 / 화장실 이동 안내 필요`) : `${lectureRoomName} 수업 / 화장실 이동 안내 필요`,
      };
    }
    if (mapping.isMixedGrade && mapping.urineExamAvailability === '불가') {
      return {
        ...mapping,
        restroomAccessible: true,
        urineExamAvailability: '주의',
        reason: mapping.reason && mapping.reason !== '여러 학년 혼합 수업' ? mixedRoomReason(mapping.reason) : MIXED_GRADE_NOTE,
      };
    }
    return mapping;
  });
}

function mixedRoomReason(reason: string) {
  return [reason, MIXED_GRADE_NOTE].filter(Boolean).join(' / ');
}

function normalizeRestrictedVenues(venues: AppData['restrictedVenues']): AppData['restrictedVenues'] {
  return venues.map((venue) => {
    const lectureRoomName = normalizeComprehensiveLectureRoom(venue.name);
    if (!lectureRoomName) return venue;
    return {
      ...venue,
      name: lectureRoomName,
      hasStudentRestroom: true,
      mode: '주의',
      note: `${lectureRoomName} 수업 / 화장실 이동 안내 필요`,
    };
  });
}

function normalizeRestrictedVenueEntries(entries: AppData['restrictedVenueEntries']): AppData['restrictedVenueEntries'] {
  return entries.map((entry) => {
    const lectureRoomName = normalizeComprehensiveLectureRoom(entry.venueName);
    if (!lectureRoomName) return entry;
    return {
      ...entry,
      venueName: lectureRoomName,
      mode: '주의',
      reason: `${lectureRoomName} 수업 / 화장실 이동 안내 필요`,
    };
  });
}

function normalizeComprehensiveLectureRoom(value = '') {
  const normalized = value.replace(/\s/g, '').toUpperCase();
  if (
    normalized.includes('5층중강') ||
    normalized.includes('5층종강') ||
    normalized.includes('5층종합강의실') ||
    normalized.includes('5층종합')
  ) {
    return '5층 종합강의실';
  }
  if (
    /^U-2-\d+/.test(normalized) ||
    normalized.includes('2층종합강의실') ||
    normalized.includes('2층종강') ||
    normalized.includes('2층중강') ||
    normalized.includes('2층종합') ||
    normalized.includes('종강1') ||
    normalized.includes('종강2') ||
    normalized.includes('중강1') ||
    normalized.includes('중강2') ||
    normalized.includes('중강기') ||
    normalized === '종합강의실'
  ) {
    return '2층 종합강의실';
  }
  return '';
}

function normalizeSettings(settings: AppData['settings'], fallback: AppData['settings']) {
  const hasStoredGradeTimeMode = typeof settings.gradeTimeMode === 'string';
  settings.operationMode = ['visit', 'move'].includes(String(settings.operationMode))
    ? settings.operationMode
    : settings.examType === 'tb'
      ? 'move'
      : 'visit';
  settings.urineSimultaneous = typeof settings.urineSimultaneous === 'boolean' ? settings.urineSimultaneous : fallback.urineSimultaneous;
  settings.urineParallelMode = settings.urineParallelMode ?? fallback.urineParallelMode;
  settings.urineMixedGradeHandling = ['allow-caution', 'manual-confirm', 'exclude'].includes(String(settings.urineMixedGradeHandling))
    ? settings.urineMixedGradeHandling
    : fallback.urineMixedGradeHandling;
  settings.teamsByGrade = settings.teamsByGrade ?? fallback.teamsByGrade;
  settings.gradeStartTimes = settings.gradeStartTimes ?? fallback.gradeStartTimes;
  settings.tbMixedClassHandling = ['auto', 'defer', 'manual'].includes(String(settings.tbMixedClassHandling))
    ? settings.tbMixedClassHandling
    : fallback.tbMixedClassHandling;
  settings.tbSameGradeMixedExtraMinutes = Number.isFinite(settings.tbSameGradeMixedExtraMinutes) ? settings.tbSameGradeMixedExtraMinutes : fallback.tbSameGradeMixedExtraMinutes;
  settings.tbMixedGradeExtraMinutes = Number.isFinite(settings.tbMixedGradeExtraMinutes) ? settings.tbMixedGradeExtraMinutes : fallback.tbMixedGradeExtraMinutes;
  settings.tbMixedManualClassThreshold = Number.isFinite(settings.tbMixedManualClassThreshold) ? settings.tbMixedManualClassThreshold : fallback.tbMixedManualClassThreshold;
  settings.tbMixedUseTwoSlots = typeof settings.tbMixedUseTwoSlots === 'boolean' ? settings.tbMixedUseTwoSlots : fallback.tbMixedUseTwoSlots;
  settings.useGradeTimeBlocks = typeof settings.useGradeTimeBlocks === 'boolean' ? settings.useGradeTimeBlocks : fallback.useGradeTimeBlocks;
  settings.gradeTimeMode = normalizeGradeTimeMode(settings.gradeTimeMode, fallback.gradeTimeMode);
  if (settings.examType === 'tb' && !hasStoredGradeTimeMode) settings.useGradeTimeBlocks = true;
  settings.gradeTimeBlocks = Array.isArray(settings.gradeTimeBlocks) ? settings.gradeTimeBlocks : fallback.gradeTimeBlocks;
}

function normalizeGradeTimeMode(value: unknown, fallback: AppData['settings']['gradeTimeMode']) {
  return ['G2_AM_G3_PM', 'G3_AM_G2_PM', 'BOTH_AM', 'BOTH_PM', 'CUSTOM_BY_GRADE', 'ALL_GRADES_FULL_RANGE'].includes(String(value))
    ? (value as AppData['settings']['gradeTimeMode'])
    : fallback;
}

function ensureRequiredBlockedKeywords(settings: AppData['settings']) {
  settings.blockedKeywords = mergeRequiredKeywords(settings.blockedKeywords);
}

function normalizeKeywordSets(value: unknown, fallback: AppData['keywordSets']): AppData['keywordSets'] {
  if (!value || typeof value !== 'object') return fallback;
  const stored = value as Partial<AppData['keywordSets']> & { tuberculosis?: AppData['keywordSets']['tb'] };
  return {
    urine: {
      blockedKeywords: mergeRequiredKeywords(Array.isArray(stored.urine?.blockedKeywords) ? stored.urine.blockedKeywords : fallback.urine.blockedKeywords),
      cautionKeywords: Array.isArray(stored.urine?.cautionKeywords) ? stored.urine.cautionKeywords : fallback.urine.cautionKeywords,
    },
    tb: {
      blockedKeywords: mergeRequiredKeywords(
        Array.isArray(stored.tb?.blockedKeywords)
          ? stored.tb.blockedKeywords
          : Array.isArray(stored.tuberculosis?.blockedKeywords)
            ? stored.tuberculosis.blockedKeywords
            : fallback.tb.blockedKeywords,
      ),
      cautionKeywords: Array.isArray(stored.tb?.cautionKeywords)
        ? stored.tb.cautionKeywords
        : Array.isArray(stored.tuberculosis?.cautionKeywords)
          ? stored.tuberculosis.cautionKeywords
          : fallback.tb.cautionKeywords,
    },
  };
}

function mergeRequiredKeywords(keywords: string[]) {
  const next = [...keywords];
  for (const keyword of REQUIRED_BLOCKED_KEYWORDS) {
    if (!next.includes(keyword)) next.push(keyword);
  }
  return next;
}

export function getStoredAppDataInfo() {
  const activeType = normalizeHealthCheckType(storageAdapter.getItem<string>(ACTIVE_HEALTH_CHECK_TYPE_KEY));
  const parsed =
    storageAdapter.getItem<{ appDataVersion?: string }>(getHealthCheckStorageKey(activeType)) ??
    storageAdapter.getItem<{ appDataVersion?: string }>(STORAGE_KEY);
  if (!parsed) return { exists: false, versionMismatch: false };
  try {
    return {
      exists: true,
      versionMismatch: parsed.appDataVersion !== APP_DATA_VERSION,
    };
  } catch {
    return { exists: true, versionMismatch: true };
  }
}

export function saveAppData(data: AppData) {
  const healthCheckType = normalizeHealthCheckType(data.settings.healthCheckType ?? data.healthCheckType);
  storageAdapter.setItem(ACTIVE_HEALTH_CHECK_TYPE_KEY, healthCheckType);
  storageAdapter.setItem(getHealthCheckStorageKey(healthCheckType), { ...data, healthCheckType, appDataVersion: APP_DATA_VERSION });
}

export function clearAppData() {
  storageAdapter.clear();
}
