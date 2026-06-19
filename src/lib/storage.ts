import type { AppData, ExamType } from '../types';
import { createDefaultData } from './defaultData';

const STORAGE_KEY = 'urine-exam-room-scheduler:v1';
const REQUIRED_BLOCKED_KEYWORDS = ['스생'];

export function loadAppData(): AppData {
  if (typeof localStorage === 'undefined') return createDefaultData();

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return createDefaultData();
    const parsed = JSON.parse(raw) as Partial<AppData>;
    const fallback = createDefaultData();

    const settings = { ...fallback.settings, ...parsed.settings };
    settings.examType = normalizeExamType(settings.examType);
    normalizeSettings(settings, fallback.settings);
    ensureRequiredBlockedKeywords(settings);
    const templates = Array.isArray(parsed.templates)
      ? parsed.templates.map((template) => ({
          ...template,
          examType: normalizeExamType(template.examType),
          data: {
            ...template.data,
            restrictedVenues: Array.isArray(template.data?.restrictedVenues) ? template.data.restrictedVenues : [],
            restrictedVenueEntries: Array.isArray(template.data?.restrictedVenueEntries) ? template.data.restrictedVenueEntries : [],
            restrictedVenueWeekday: normalizeRestrictedVenueWeekday(template.data?.restrictedVenueWeekday),
            settings: {
              ...fallback.settings,
              ...template.data?.settings,
              examType: normalizeExamType(template.data?.settings?.examType ?? template.examType),
            },
          },
        }))
      : fallback.templates;
    const templateTypes = new Set(templates.map((template) => template.examType));
    for (const fallbackTemplate of fallback.templates) {
      if (!templateTypes.has(fallbackTemplate.examType)) templates.push(fallbackTemplate);
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
      restrictedVenues: Array.isArray(parsed.restrictedVenues) ? parsed.restrictedVenues : [],
      restrictedVenueEntries: Array.isArray(parsed.restrictedVenueEntries) ? parsed.restrictedVenueEntries : [],
      restrictedVenueWeekday: normalizeRestrictedVenueWeekday(parsed.restrictedVenueWeekday),
      templates,
      activeTemplateId: typeof parsed.activeTemplateId === 'string' ? parsed.activeTemplateId : fallback.activeTemplateId,
      schoolDefaults: parsed.schoolDefaults?.daySchedule ? parsed.schoolDefaults : fallback.schoolDefaults,
      keywordSets: normalizeKeywordSets(parsed.keywordSets, fallback.keywordSets),
      hasSelectedExamType: typeof parsed.hasSelectedExamType === 'boolean' ? parsed.hasSelectedExamType : false,
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

function normalizeSettings(settings: AppData['settings'], fallback: AppData['settings']) {
  settings.urineSimultaneous = typeof settings.urineSimultaneous === 'boolean' ? settings.urineSimultaneous : fallback.urineSimultaneous;
  settings.urineParallelMode = settings.urineParallelMode ?? fallback.urineParallelMode;
  settings.teamsByGrade = settings.teamsByGrade ?? fallback.teamsByGrade;
  settings.gradeStartTimes = settings.gradeStartTimes ?? fallback.gradeStartTimes;
  settings.useGradeTimeBlocks = typeof settings.useGradeTimeBlocks === 'boolean' ? settings.useGradeTimeBlocks : fallback.useGradeTimeBlocks;
  settings.gradeTimeBlocks = Array.isArray(settings.gradeTimeBlocks) ? settings.gradeTimeBlocks : fallback.gradeTimeBlocks;
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

export function saveAppData(data: AppData) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function clearAppData() {
  localStorage.removeItem(STORAGE_KEY);
}
