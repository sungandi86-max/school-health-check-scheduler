import type { AppData, ExamType } from '../types';
import { createDefaultData } from './defaultData';

const STORAGE_KEY = 'urine-exam-room-scheduler:v1';

export function loadAppData(): AppData {
  if (typeof localStorage === 'undefined') return createDefaultData();

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return createDefaultData();
    const parsed = JSON.parse(raw) as Partial<AppData>;
    const fallback = createDefaultData();

    const settings = { ...fallback.settings, ...parsed.settings };
    settings.examType = normalizeExamType(settings.examType);
    const templates = Array.isArray(parsed.templates)
      ? parsed.templates.map((template) => ({
          ...template,
          examType: normalizeExamType(template.examType),
          data: {
            ...template.data,
            settings: {
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

    return {
      settings,
      locations: Array.isArray(parsed.locations) ? parsed.locations : fallback.locations,
      timetables: Array.isArray(parsed.timetables) ? parsed.timetables : fallback.timetables,
      divisions: Array.isArray(parsed.divisions) ? parsed.divisions : fallback.divisions,
      judgements: Array.isArray(parsed.judgements) ? parsed.judgements : [],
      assignments: Array.isArray(parsed.assignments) ? parsed.assignments : [],
      manualOverrides: Array.isArray(parsed.manualOverrides) ? parsed.manualOverrides : [],
      templates,
      activeTemplateId: typeof parsed.activeTemplateId === 'string' ? parsed.activeTemplateId : fallback.activeTemplateId,
      schoolDefaults: parsed.schoolDefaults?.daySchedule ? parsed.schoolDefaults : fallback.schoolDefaults,
      keywordSets: parsed.keywordSets ? { ...fallback.keywordSets, ...parsed.keywordSets } : fallback.keywordSets,
      hasSelectedExamType: typeof parsed.hasSelectedExamType === 'boolean' ? parsed.hasSelectedExamType : false,
    };
  } catch {
    return createDefaultData();
  }
}

function normalizeExamType(value: unknown): ExamType {
  return value === 'tb' || value === '결핵검진' ? 'tb' : 'urine';
}

export function saveAppData(data: AppData) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function clearAppData() {
  localStorage.removeItem(STORAGE_KEY);
}
