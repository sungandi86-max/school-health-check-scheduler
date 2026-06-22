import type { ExamSettings, GradeTimeBlock, GradeTimeMode } from '../types';

export const GRADE_TIME_MODE_OPTIONS: { value: GradeTimeMode; label: string }[] = [
  { value: 'G2_AM_G3_PM', label: '2학년 오전 / 3학년 오후' },
  { value: 'G3_AM_G2_PM', label: '3학년 오전 / 2학년 오후' },
  { value: 'BOTH_AM', label: '2·3학년 모두 오전' },
  { value: 'BOTH_PM', label: '2·3학년 모두 오후' },
  { value: 'CUSTOM_BY_GRADE', label: '학년별 직접 지정' },
  { value: 'ALL_GRADES_FULL_RANGE', label: '학년 구분 없이 전체 시간 사용' },
];

export function getGradeTimeModeLabel(mode: GradeTimeMode | undefined) {
  return GRADE_TIME_MODE_OPTIONS.find((item) => item.value === mode)?.label ?? GRADE_TIME_MODE_OPTIONS[0].label;
}

export function getEffectiveGradeTimeBlocks(settings: ExamSettings): GradeTimeBlock[] {
  if (!settings.useGradeTimeBlocks || settings.gradeTimeMode === 'ALL_GRADES_FULL_RANGE') return [];
  if (settings.gradeTimeMode === 'CUSTOM_BY_GRADE') return ensureGradeTimeBlocks(settings.gradeTimeBlocks, settings);
  return calculateGradeTimeBlocks(settings, settings.gradeTimeMode);
}

export function calculateGradeTimeBlocks(settings: ExamSettings, mode: GradeTimeMode = settings.gradeTimeMode): GradeTimeBlock[] {
  const dayParts = getDayParts(settings);
  const am = dayParts.am;
  const pm = dayParts.pm;
  const full = { label: '전체 시간', startTime: settings.startTime, endTime: settings.endTime };

  if (mode === 'G3_AM_G2_PM') {
    return [
      { grade: '2', label: '2학년 오후', startTime: pm.startTime, endTime: pm.endTime },
      { grade: '3', label: '3학년 오전', startTime: am.startTime, endTime: am.endTime },
    ];
  }
  if (mode === 'BOTH_AM') {
    return [
      { grade: '2', label: '2학년 오전', startTime: am.startTime, endTime: am.endTime },
      { grade: '3', label: '3학년 오전', startTime: am.startTime, endTime: am.endTime },
    ];
  }
  if (mode === 'BOTH_PM') {
    return [
      { grade: '2', label: '2학년 오후', startTime: pm.startTime, endTime: pm.endTime },
      { grade: '3', label: '3학년 오후', startTime: pm.startTime, endTime: pm.endTime },
    ];
  }
  if (mode === 'ALL_GRADES_FULL_RANGE') {
    return [
      { grade: '2', label: '2학년 전체 시간', startTime: full.startTime, endTime: full.endTime },
      { grade: '3', label: '3학년 전체 시간', startTime: full.startTime, endTime: full.endTime },
    ];
  }
  if (mode === 'CUSTOM_BY_GRADE') return ensureGradeTimeBlocks(settings.gradeTimeBlocks, settings);
  return [
    { grade: '2', label: '2학년 오전', startTime: am.startTime, endTime: am.endTime },
    { grade: '3', label: '3학년 오후', startTime: pm.startTime, endTime: pm.endTime },
  ];
}

export function isCombinedGradeTimeMode(mode: GradeTimeMode | undefined) {
  return mode === 'BOTH_AM' || mode === 'BOTH_PM' || mode === 'ALL_GRADES_FULL_RANGE';
}

function ensureGradeTimeBlocks(blocks: GradeTimeBlock[], settings: ExamSettings): GradeTimeBlock[] {
  const calculated = calculateGradeTimeBlocks({ ...settings, gradeTimeMode: 'G2_AM_G3_PM' }, 'G2_AM_G3_PM');
  return ['2', '3'].map((grade) => {
    const existing = blocks.find((item) => item.grade === grade);
    const fallback = calculated.find((item) => item.grade === grade);
    return {
      grade,
      label: existing?.label || fallback?.label || `${grade}학년`,
      startTime: existing?.startTime || fallback?.startTime || settings.startTime,
      endTime: existing?.endTime || fallback?.endTime || settings.endTime,
    };
  });
}

function getDayParts(settings: ExamSettings) {
  const lunch = settings.daySchedule.find((item) => item.id === 'lunch') ?? settings.daySchedule.find((item) => /점심|lunch/i.test(item.label));
  const amEnd = lunch?.startTime || midpoint(settings.startTime, settings.endTime);
  const pmStart = lunch?.endTime || amEnd;
  return {
    am: normalizeRange(settings.startTime, amEnd, settings.startTime, settings.endTime),
    pm: normalizeRange(pmStart, settings.endTime, settings.startTime, settings.endTime),
  };
}

function normalizeRange(startTime: string, endTime: string, fallbackStart: string, fallbackEnd: string) {
  if (toMinutes(startTime) >= toMinutes(endTime)) return { startTime: fallbackStart, endTime: fallbackEnd };
  return { startTime, endTime };
}

function midpoint(startTime: string, endTime: string) {
  const mid = Math.floor((toMinutes(startTime) + toMinutes(endTime)) / 2);
  const hour = String(Math.floor(mid / 60)).padStart(2, '0');
  const minute = String(mid % 60).padStart(2, '0');
  return `${hour}:${minute}`;
}

function toMinutes(time: string) {
  const [hour = '0', minute = '0'] = time.split(':');
  return Number(hour) * 60 + Number(minute);
}
