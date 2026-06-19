import type {
  AppData,
  ExamSettings,
  JudgementStatus,
  ManualOverride,
  PeriodJudgement,
  ScheduleAssignment,
  SubjectDivision,
  TimetableRow,
  VisitLocation,
} from '../types';

function hasKeyword(subject: string, keywords: string[]) {
  const normalized = subject.replace(/\s/g, '').toLowerCase();
  return keywords.some((keyword) => keyword.trim() && normalized.includes(keyword.replace(/\s/g, '').toLowerCase()));
}

function timeToMinutes(time: string) {
  const [hour = '0', minute = '0'] = time.split(':');
  return Number(hour) * 60 + Number(minute);
}

function minutesToTime(total: number) {
  const hour = Math.floor(total / 60);
  const minute = total % 60;
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

type Slot = { time: string; period: number; isBreak?: boolean };

function getAssignableSlots(
  settings: ExamSettings,
  options: { startTime?: string; endTime?: string; lineCount?: number } = {},
) {
  const globalStart = Math.max(timeToMinutes(settings.startTime), timeToMinutes(options.startTime ?? settings.startTime));
  const globalEnd = Math.min(timeToMinutes(settings.endTime), timeToMinutes(options.endTime ?? settings.endTime));
  const lines = Math.max(1, options.lineCount ?? settings.teamCount ?? 1);
  const slots: Slot[] = [];

  for (const item of settings.daySchedule) {
    if (item.kind !== 'period' || !item.period || !item.assignable || !settings.availablePeriods.includes(item.period)) continue;
    const start = Math.max(timeToMinutes(item.startTime), globalStart);
    const end = Math.min(timeToMinutes(item.endTime), globalEnd);
    const latestStart = settings.allowCrossPeriod ? end : end - settings.durationMinutes;
    for (let current = start; current <= latestStart; current += settings.durationMinutes) {
      if (current < globalStart || current + settings.durationMinutes > globalEnd) continue;
      if (overlapsExcludedTime(current, current + settings.durationMinutes, settings.excludedTimes)) continue;
      if (overlapsNonAssignableSchedule(current, current + settings.durationMinutes, settings)) continue;
      for (let team = 0; team < lines; team += 1) {
        slots.push({ time: minutesToTime(current), period: item.period });
      }
    }
  }

  if (settings.includeBreaks) {
    const periods = settings.daySchedule.filter((item) => item.kind === 'period' && item.period && settings.availablePeriods.includes(item.period));
    for (let index = 0; index < periods.length - 1; index += 1) {
      const currentPeriod = periods[index];
      const nextPeriod = periods[index + 1];
      if (!currentPeriod.period || !nextPeriod.period) continue;
      const start = Math.max(timeToMinutes(currentPeriod.endTime), globalStart);
      const end = Math.min(timeToMinutes(nextPeriod.startTime), globalEnd);
      if (start >= end) continue;
      for (let current = start; current + settings.durationMinutes <= end; current += settings.durationMinutes) {
        if (overlapsExcludedTime(current, current + settings.durationMinutes, settings.excludedTimes)) continue;
        if (overlapsNonAssignableSchedule(current, current + settings.durationMinutes, settings)) continue;
        for (let team = 0; team < lines; team += 1) {
          slots.push({ time: minutesToTime(current), period: nextPeriod.period, isBreak: true });
        }
      }
    }
  }

  slots.sort((a, b) => timeToMinutes(a.time) - timeToMinutes(b.time) || a.period - b.period);
  return slots;
}

function overlapsNonAssignableSchedule(start: number, end: number, settings: ExamSettings) {
  return settings.daySchedule.some((item) => {
    if (item.kind === 'period' && item.assignable) return false;
    const itemStart = timeToMinutes(item.startTime);
    const itemEnd = timeToMinutes(item.endTime);
    return start < itemEnd && end > itemStart;
  });
}

function overlapsExcludedTime(start: number, end: number, excludedTimes: string) {
  const ranges = excludedTimes
    .split(/,|\n/)
    .map((item) => item.trim())
    .map((item) => item.match(/(\d{1,2}:\d{2})\s*[-~]\s*(\d{1,2}:\d{2})/))
    .filter(Boolean) as RegExpMatchArray[];

  return ranges.some((range) => {
    const rangeStart = timeToMinutes(range[1]);
    const rangeEnd = timeToMinutes(range[2]);
    return start < rangeEnd && end > rangeStart;
  });
}

function isAssignableCallTime(time: string, settings: ExamSettings) {
  const minute = timeToMinutes(time);
  if (overlapsExcludedTime(minute, minute + 1, settings.excludedTimes)) return false;
  return settings.daySchedule.some((item) => {
    if (item.kind !== 'period' || !item.period || !item.assignable || !settings.availablePeriods.includes(item.period)) return false;
    return minute >= timeToMinutes(item.startTime) && minute < timeToMinutes(item.endTime);
  });
}

function appendNote(assignment: ScheduleAssignment, note: string) {
  assignment.note = [assignment.note, note].filter(Boolean).join(' / ');
}

function sortDisplay(a: VisitLocation, b: VisitLocation) {
  return a.grade.localeCompare(b.grade, 'ko') || a.displayName.localeCompare(b.displayName, 'ko', { numeric: true });
}

export function judgePeriod(location: VisitLocation | undefined, row: TimetableRow | undefined, period: number, settings: ExamSettings): PeriodJudgement {
  const subject = row?.periods[period - 1]?.trim() ?? '';

  if (!location) {
    return { locationId: row?.locationId ?? '', period, subject, status: '수동확인', reason: '방문 장소 목록에 없는 시간표 행' };
  }
  if (!location.isVisitable) {
    return { locationId: location.id, period, subject, status: '불가', reason: '실제 방문 가능 여부가 불가능' };
  }
  if (!location.includeInAuto) {
    return { locationId: location.id, period, subject, status: '수동확인', reason: '자동배정 제외 장소' };
  }
  if (hasKeyword(subject, settings.blockedKeywords)) {
    return { locationId: location.id, period, subject, status: '불가', reason: `검사 불가 키워드 포함: ${subject}` };
  }
  if (hasKeyword(subject, settings.cautionKeywords)) {
    return { locationId: location.id, period, subject, status: '주의', reason: `주의 키워드 포함: ${subject}` };
  }
  return { locationId: location.id, period, subject, status: '가능', reason: subject ? '일반 교실 수업' : '과목명 비어 있음' };
}

export function createJudgements(settings: ExamSettings, locations: VisitLocation[], timetables: TimetableRow[]): PeriodJudgement[] {
  return timetables.flatMap((row) => {
    const location = locations.find((item) => item.id === row.locationId || item.displayName === row.displayName);
    return Array.from({ length: 7 }, (_, index) => judgePeriod(location, row, index + 1, settings));
  });
}

function getManual(controls: ManualOverride[], locationId: string) {
  return controls.find((item) => item.locationId === locationId);
}

function buildAssignment(
  location: VisitLocation,
  row: TimetableRow | undefined,
  judgement: PeriodJudgement | undefined,
  order: number | null,
  time: string,
  manual?: ManualOverride,
  meta: { lineName?: string; timeBlockLabel?: string } = {},
): ScheduleAssignment {
  const period = manual?.period ?? judgement?.period ?? null;
  return {
    id: location.id,
    order,
    scheduledTime: manual?.scheduledTime || time,
    lineName: meta.lineName,
    timeBlockLabel: meta.timeBlockLabel,
    locationId: location.id,
    locationName: location.displayName,
    grade: location.grade,
    period,
    subject: period ? row?.periods[period - 1] ?? judgement?.subject ?? '' : judgement?.subject ?? '',
    judgement: judgement?.status ?? '수동확인',
    isManual: Boolean(manual?.scheduledTime || manual?.period || manual?.excluded || manual?.locked || manual?.note),
    locked: Boolean(manual?.locked),
    excluded: Boolean(manual?.excluded),
    note: manual?.note ?? '',
  };
}

export function createManualConfirmRows(divisions: SubjectDivision[], assignments: ScheduleAssignment[], judgements: PeriodJudgement[]) {
  const divisionRows = divisions
    .filter((item) => !item.actualLocationId || item.handling === '자동제외')
    .map((item) => ({
      name: item.name,
      type: '선택과목 분반',
      reason: '실제 방문 장소 없음',
      required: '실제 수업 장소 확인 필요',
      actualLocation: item.actualLocationId,
      note: item.notes,
    }));

  const failedRows = assignments
    .filter((item) => item.failedReason)
    .map((item) => ({
      name: item.locationName,
      type: item.excluded ? '검사 제외' : '배정 실패',
      reason: item.failedReason ?? '',
      required: '다른 교시 또는 현장 수동 확인 필요',
      actualLocation: item.locationId,
      note: item.note,
    }));

  const blockedRows = judgements
    .filter((item) => item.status === '불가')
    .map((item) => ({
      name: item.locationId,
      type: '검사 불가',
      reason: item.reason,
      required: '다른 교시 배정 필요',
      actualLocation: item.locationId,
      note: `${item.period}교시`,
    }));

  return [...divisionRows, ...failedRows, ...blockedRows];
}

export function makeSchedule(data: AppData): { judgements: PeriodJudgement[]; assignments: ScheduleAssignment[] } {
  const { settings, locations, timetables, manualOverrides } = data;
  const judgements = createJudgements(settings, locations, timetables);
  const timetableMap = new Map(timetables.map((row) => [row.locationId, row]));
  const assignments: ScheduleAssignment[] = [];

  const candidates = locations
    .filter((location) => location.includeInAuto && location.isVisitable)
    .sort(sortDisplay)
    .map((location) => {
      const valid = judgements.filter(
        (item) => item.locationId === location.id && settings.availablePeriods.includes(item.period) && (item.status === '가능' || item.status === '주의'),
      );
      return { location, valid };
    })
    .sort((a, b) => a.valid.length - b.valid.length || sortDisplay(a.location, b.location));

  if (settings.examType === 'urine' && settings.urineSimultaneous && settings.urineParallelMode === 'grade') {
    for (const grade of getGrades(candidates)) {
      assignments.push(
        ...scheduleCandidateGroup({
          candidates: candidates.filter((item) => item.location.grade === grade),
          settings,
          timetableMap,
          manualOverrides,
          slotOptions: {
            startTime: settings.gradeStartTimes[grade] ?? settings.startTime,
            endTime: settings.endTime,
            lineCount: settings.teamsByGrade[grade] ?? 1,
          },
          lineName: `${grade}학년 라인`,
        }),
      );
    }
  } else if (settings.examType === 'tb' && settings.useGradeTimeBlocks) {
    for (const grade of getGrades(candidates)) {
      const block = settings.gradeTimeBlocks.find((item) => item.grade === grade);
      assignments.push(
        ...scheduleCandidateGroup({
          candidates: candidates.filter((item) => item.location.grade === grade),
          settings,
          timetableMap,
          manualOverrides,
          slotOptions: {
            startTime: block?.startTime ?? settings.startTime,
            endTime: block?.endTime ?? settings.endTime,
            lineCount: settings.teamCount,
          },
          lineName: `${grade}학년`,
          timeBlockLabel: block ? `${block.label} ${block.startTime}~${block.endTime}` : `${grade}학년`,
        }),
      );
    }
  } else {
    assignments.push(
      ...scheduleCandidateGroup({
        candidates,
        settings,
        timetableMap,
        manualOverrides,
        slotOptions: { lineCount: settings.teamCount },
        lineName: settings.examType === 'urine' ? '통합 라인' : '통합 검진',
      }),
    );
  }

  const sortedAssignments = assignments.sort((a, b) => {
      if (a.order) return -1;
      if (b.order) return 1;
      const timeCompare = timeToMinutes(a.scheduledTime || '23:59') - timeToMinutes(b.scheduledTime || '23:59');
      if (timeCompare) return timeCompare;
      const lineCompare = (a.lineName ?? '').localeCompare(b.lineName ?? '', 'ko', { numeric: true });
      if (lineCompare) return lineCompare;
      return a.locationName.localeCompare(b.locationName, 'ko', { numeric: true });
    });
  let nextOrder = 1;
  sortedAssignments.forEach((assignment) => {
    if (assignment.order) assignment.order = nextOrder++;
  });

  return {
    judgements,
    assignments: sortedAssignments,
  };
}

function getGrades(candidates: { location: VisitLocation; valid: PeriodJudgement[] }[]) {
  return [...new Set(candidates.map((item) => item.location.grade).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'ko', { numeric: true }));
}

function scheduleCandidateGroup({
  candidates,
  settings,
  timetableMap,
  manualOverrides,
  slotOptions,
  lineName,
  timeBlockLabel,
}: {
  candidates: { location: VisitLocation; valid: PeriodJudgement[] }[];
  settings: ExamSettings;
  timetableMap: Map<string, TimetableRow>;
  manualOverrides: ManualOverride[];
  slotOptions: { startTime?: string; endTime?: string; lineCount?: number };
  lineName: string;
  timeBlockLabel?: string;
}) {
  const slots = getAssignableSlots(settings, slotOptions);
  const usedSlots = new Set<number>();
  const assignments: ScheduleAssignment[] = [];

  for (const { location, valid } of candidates) {
    const manual = getManual(manualOverrides, location.id);
    const row = timetableMap.get(location.id);

    if (manual?.excluded) {
      const assignment = buildAssignment(location, row, undefined, null, '', manual, { lineName, timeBlockLabel });
      assignment.failedReason = '사용자가 검사 제외 처리';
      assignments.push(assignment);
      continue;
    }

    const preferred = manual?.period ? valid.find((item) => item.period === manual.period) : undefined;
    const slotIndex = slots.findIndex(
      (slot, index) => !usedSlots.has(index) && valid.some((item) => item.period === slot.period) && (!manual?.period || slot.period === manual.period),
    );
    const slot = slotIndex >= 0 ? slots[slotIndex] : undefined;
    const judgement = preferred ?? valid.find((item) => item.period === slot?.period) ?? valid[0];
    const assignment = buildAssignment(location, row, judgement, null, manual?.scheduledTime || slot?.time || '', manual, {
      lineName,
      timeBlockLabel,
    });

    if (!judgement) {
      assignment.failedReason = '검사 가능한 교시가 없음';
    } else if (!slot && !manual?.scheduledTime) {
      assignment.failedReason = settings.examType === 'tb' ? '학년별 검진 가능 시간 구간 안에 배정 불가' : '해당 학년 라인 시간 안에 배정 불가';
    } else {
      assignment.order = assignments.filter((item) => item.order).length + 1;
      if (slotIndex >= 0) usedSlots.add(slotIndex);
    }
    if (slot?.isBreak) appendNote(assignment, '쉬는 시간 포함');
    enrichExamTimes(assignment, settings);
    assignments.push(assignment);
  }

  return assignments;
}

function enrichExamTimes(assignment: ScheduleAssignment, settings: ExamSettings) {
  assignment.examTime = assignment.scheduledTime;
  assignment.examVenue = settings.examVenue;

  if (settings.examType === 'tb' && assignment.scheduledTime) {
    assignment.callTime = minutesToTime(timeToMinutes(assignment.scheduledTime) - Math.max(0, settings.travelMinutes || 0));
    if (!isAssignableCallTime(assignment.callTime, settings)) {
      assignment.failedReason = assignment.failedReason || '호출 시간이 조회시간, 점심시간 또는 제외 시간 등 배정 불가 시간에 걸림';
    }
  }
}
