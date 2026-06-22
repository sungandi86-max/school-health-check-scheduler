import type {
  AppData,
  ExamSettings,
  JudgementStatus,
  ManualOverride,
  PeriodJudgement,
  RestrictedVenueEntry,
  RoomMapping,
  ScheduleAssignment,
  SubjectDivision,
  TimetableRow,
  VenueRestrictionWeekday,
  VisitLocation,
} from '../types';
import { getEffectiveGradeTimeBlocks, getGradeTimeModeLabel, isCombinedGradeTimeMode } from './gradeTime';
import { parseSubjectCell } from './subjectParser';

const SECOND_FLOOR_LECTURE_ROOM_NOTE = '2층 종합강의실 수업 / 화장실 이동 안내 필요';
const MIXED_GRADE_NOTE = '혼합학년 수업 / 명렬표 확인 필요';
const LOW_CONFIDENCE_ROOM_NOTE = '실제 수업 장소 확인 필요';
const DUPLICATE_VISIT_LOCATION_NOTE = '동일한 방문 장소가 여러 번 배정되어 수동 확인 필요';
const TB_ROOM_MAPPING_CONFIRM_NOTE = '실제 수업 교실 매칭 불명확 / 수동 확인 필요';

function hasKeyword(subject: string, keywords: string[]) {
  const normalized = subject.replace(/\s/g, '').toLowerCase();
  return keywords.some((keyword) => keyword.trim() && normalized.includes(keyword.replace(/\s/g, '').toLowerCase()));
}

function normalizeRoomText(value = '') {
  return value.replace(/\s/g, '').toUpperCase();
}

function normalizeVisitLocationKey(value = '') {
  return normalizeRoomText(value).replace(/교실$/, '');
}

function joinNotes(...notes: Array<string | undefined>) {
  return [...new Set(notes.filter(Boolean))].join(' / ');
}

function isSecondFloorLectureRoomName(value = '') {
  const normalized = normalizeRoomText(value);
  return (
    /^U-2-\d+/.test(normalized) ||
    normalized.includes('2층종합강의실') ||
    normalized.includes('종합강의실') ||
    normalized.includes('2층종강') ||
    normalized.includes('2층중강') ||
    normalized.includes('종강1') ||
    normalized.includes('종강2') ||
    normalized.includes('중강1') ||
    normalized.includes('중강2') ||
    normalized.includes('중강기')
  );
}

function isSecondFloorLectureRoomSource(roomMapping?: RoomMapping, restriction?: RestrictedVenueEntry) {
  return (
    isSecondFloorLectureRoomName(roomMapping?.actualRoom) ||
    isSecondFloorLectureRoomName(roomMapping?.comciganRoom) ||
    isSecondFloorLectureRoomName(restriction?.venueName) ||
    roomMapping?.reason === SECOND_FLOOR_LECTURE_ROOM_NOTE ||
    restriction?.reason === SECOND_FLOOR_LECTURE_ROOM_NOTE
  );
}

function displaySecondFloorLectureRoomName(value?: string) {
  return isSecondFloorLectureRoomName(value) ? '2층 종합강의실' : value;
}

function isBareRoomNumber(value?: string) {
  return /^\d{1,2}$/.test(String(value ?? '').trim());
}

function normalizeVisitRoomName(value?: string) {
  return displaySecondFloorLectureRoomName(value)?.trim() ?? '';
}

function getUnitName(location: VisitLocation) {
  return location.displayName.replace(/교실$/, '');
}

function getActualRoomName(judgement?: PeriodJudgement) {
  if (judgement?.roomMappingConfidence === 'low') return undefined;
  return normalizeVisitRoomName(judgement?.actualRoom || judgement?.restrictedVenueName) || undefined;
}

function getDisplayVisitLocation(location: VisitLocation, judgement?: PeriodJudgement) {
  return getActualRoomName(judgement) || location.displayName || getUnitName(location);
}

function isMixedGradeJudgement(judgement?: PeriodJudgement) {
  return Boolean(judgement?.reason.includes(MIXED_GRADE_NOTE) || judgement?.roomMappingReason?.includes(MIXED_GRADE_NOTE));
}

function isSecondFloorLectureRoomJudgement(judgement?: PeriodJudgement) {
  if (!judgement) return false;
  return (
    isSecondFloorLectureRoomName(judgement.actualRoom) ||
    isSecondFloorLectureRoomName(judgement.restrictedVenueName) ||
    judgement.roomMappingReason === SECOND_FLOOR_LECTURE_ROOM_NOTE ||
    judgement.restrictedVenueReason === SECOND_FLOOR_LECTURE_ROOM_NOTE ||
    judgement.reason.includes(SECOND_FLOOR_LECTURE_ROOM_NOTE)
  );
}

function isDifferentActualRoom(location: VisitLocation, actualRoom?: string) {
  if (!actualRoom) return false;
  return normalizeVisitLocationKey(actualRoom) !== normalizeVisitLocationKey(location.displayName);
}

function tbRoomMappingReason(location: VisitLocation, roomMapping: RoomMapping, actualRoom?: string) {
  return joinNotes(
    roomMapping.isMixedClass ? '같은 학년 내 여러 학급 혼합 수업' : undefined,
    isDifferentActualRoom(location, actualRoom) ? '이동수업 / 실제 수업 장소 확인 필요' : undefined,
    isSecondFloorLectureRoomName(actualRoom) ? SECOND_FLOOR_LECTURE_ROOM_NOTE : undefined,
    roomMapping.divisionName ? '선택과목 수업 / 교과교사 확인 필요' : undefined,
    roomMapping.reason,
  ) || '분반자료 기반 실제 수업 정보 확인 필요';
}

function createAssignmentNote(manual: ManualOverride | undefined, judgement: PeriodJudgement | undefined) {
  const specialNotes = joinNotes(
    isSecondFloorLectureRoomJudgement(judgement) ? SECOND_FLOOR_LECTURE_ROOM_NOTE : undefined,
    isMixedGradeJudgement(judgement) ? MIXED_GRADE_NOTE : undefined,
    judgement?.roomMappingConfidence === 'low' ? LOW_CONFIDENCE_ROOM_NOTE : undefined,
  );
  const autoNote = specialNotes || joinNotes(
    judgement?.actualRoom && judgement.roomMappingReason ? `${normalizeVisitRoomName(judgement.actualRoom)} / ${judgement.roomMappingReason}` : undefined,
    judgement?.restrictedVenueName && judgement.restrictedVenueReason ? `${normalizeVisitRoomName(judgement.restrictedVenueName)} / ${judgement.restrictedVenueReason}` : undefined,
  );

  return joinNotes(manual?.note, autoNote);
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
  assignment.note = joinNotes(assignment.note, note);
}

function sortDisplay(a: VisitLocation, b: VisitLocation) {
  return a.grade.localeCompare(b.grade, 'ko') || a.displayName.localeCompare(b.displayName, 'ko', { numeric: true });
}

function createRestrictionMap(settings: ExamSettings, entries: RestrictedVenueEntry[], selectedWeekday: VenueRestrictionWeekday) {
  const map = new Map<string, RestrictedVenueEntry>();
  if (settings.examType !== 'urine') return map;
  const weekday = selectedWeekday === 'auto' ? weekdayFromExamDate(settings.examDate) : selectedWeekday;
  if (!weekday || weekday === 'auto') return map;
  for (const entry of entries) {
    if (entry.weekday !== weekday || entry.mode === '가능') continue;
    map.set(`${entry.className}|${entry.period}`, entry);
  }
  return map;
}

function findRoomMapping(settings: ExamSettings, mappings: RoomMapping[], location: VisitLocation | undefined, row: TimetableRow, period: number) {
  if (!mappings.length) return undefined;
  const subject = row.periods[period - 1] ?? '';
  const teacher = row.teachers?.[period - 1] ?? '';
  const rawText = row.rawTexts?.[period - 1] ?? subject;
  const className = normalizeClassName(row.displayName || location?.displayName || row.locationId);
  const candidates = mappings.filter((mapping) => !mapping.grade || !location?.grade || mapping.grade === location.grade);
  const best = candidates
    .map((mapping) => scoreRoomMapping(mapping, { subject, teacher, rawText, className }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)[0];
  if (!best) return undefined;
  if (best.confidence !== 'low') return { ...best.mapping, confidence: best.confidence };
  return {
    ...best.mapping,
    confidence: 'low' as const,
    actualRoom: '',
    reason: joinNotes(best.mapping.reason, LOW_CONFIDENCE_ROOM_NOTE),
  };
}

function scoreRoomMapping(
  mapping: RoomMapping,
  target: { subject: string; teacher: string; rawText: string; className: string },
) {
  const subject = normalizeText(target.subject);
  const teacher = normalizeText(target.teacher);
  const rawText = normalizeText(target.rawText);
  const subjectName = normalizeText(mapping.subjectName ?? '');
  const divisionName = normalizeText(mapping.divisionName ?? '');
  const mappingTeacher = normalizeText(mapping.teacher ?? '');
  const comciganRoom = normalizeText(mapping.comciganRoom ?? '');
  let score = 0;

  if (mapping.involvedClasses?.length && !mapping.involvedClasses.includes(target.className)) {
    return { mapping, score: 0, confidence: 'low' as const };
  }
  const classMatched = mapping.involvedClasses?.includes(target.className) ?? false;
  const teacherMatched = Boolean(teacher && mappingTeacher && teacher === mappingTeacher);
  const subjectMatched = Boolean(
    (subject && subjectName && (subject.includes(subjectName) || subjectName.includes(subject))) ||
      (subject && divisionName && (subject.includes(divisionName) || divisionName.includes(subject))) ||
      (rawText && subjectName && rawText.includes(subjectName)) ||
      (rawText && divisionName && rawText.includes(divisionName))
  );

  if (teacherMatched) score += 6;
  if (subject && subjectName && (subject.includes(subjectName) || subjectName.includes(subject))) score += 4;
  if (subject && divisionName && (subject.includes(divisionName) || divisionName.includes(subject))) score += 5;
  if (rawText && subjectName && rawText.includes(subjectName)) score += 2;
  if (rawText && divisionName && rawText.includes(divisionName)) score += 2;
  if (rawText && comciganRoom && rawText.includes(comciganRoom)) score += 1;
  if (classMatched) score += 1;

  const bareNumberActualRoom = isBareRoomNumber(mapping.actualRoom);
  const confidence: RoomMapping['confidence'] =
    classMatched && subjectMatched && teacherMatched
      ? 'high'
      : classMatched && subjectMatched && !bareNumberActualRoom
        ? 'medium'
        : 'low';

  return { mapping, score, confidence };
}

function normalizeText(value: string) {
  return value.replace(/\s/g, '').toLowerCase();
}

function weekdayFromExamDate(examDate: string): VenueRestrictionWeekday {
  if (!examDate) return 'auto';
  const day = new Date(`${examDate}T00:00:00`).getDay();
  const weekdays: Record<number, VenueRestrictionWeekday> = { 1: '월', 2: '화', 3: '수', 4: '목', 5: '금' };
  return weekdays[day] ?? 'auto';
}

function normalizeClassName(value: string) {
  const text = value.replace(/\s/g, '');
  const dashed = text.match(/([1-6])-(\d{1,2})/);
  if (dashed) return `${dashed[1]}-${Number(dashed[2])}`;
  const code = text.match(/\b([1-6]\d{2})\b/);
  if (code) return `${code[1][0]}-${Number(code[1].slice(1))}`;
  return text.replace(/교실$/, '');
}

export function judgePeriod(
  location: VisitLocation | undefined,
  row: TimetableRow | undefined,
  period: number,
  settings: ExamSettings,
  roomMapping?: RoomMapping,
  restriction?: RestrictedVenueEntry,
): PeriodJudgement {
  const subject = row?.periods[period - 1]?.trim() ?? '';
  const teacher = row?.teachers?.[period - 1]?.trim() ?? '';
  const isMixedGrade = Boolean(roomMapping?.isMixedGrade);
  const roomMappingConfidence = roomMapping?.confidence;
  const confidentActualRoom = roomMappingConfidence === 'low' ? undefined : roomMapping?.actualRoom;

  if (!location) {
    return { locationId: row?.locationId ?? '', period, subject, status: '수동확인', reason: '방문 장소 목록에 없는 시간표 행' };
  }
  if (settings.examType === 'tb' && isMixedGrade) {
    return {
      locationId: location.id,
      period,
      subject,
      teacher,
      status: '수동확인',
      reason: '여러 학년 혼합 수업으로 호출 단위 확인 필요',
      actualRoom: confidentActualRoom,
      roomMappingReason: roomMapping?.mixedReason || '여러 학년 혼합 수업',
      roomMappingConfidence,
      involvedGrades: roomMapping?.involvedGrades,
      involvedClasses: roomMapping?.involvedClasses,
      comciganRoom: roomMapping?.comciganRoom,
    };
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
  if (settings.examType === 'tb' && roomMapping && roomMappingConfidence === 'low') {
    return {
      locationId: location.id,
      period,
      subject,
      teacher,
      status: '수동확인',
      reason: TB_ROOM_MAPPING_CONFIRM_NOTE,
      roomMappingReason: TB_ROOM_MAPPING_CONFIRM_NOTE,
      roomMappingConfidence,
      involvedGrades: roomMapping.involvedGrades,
      involvedClasses: roomMapping.involvedClasses,
      comciganRoom: roomMapping.comciganRoom,
    };
  }
  if (settings.examType === 'tb' && roomMapping) {
    const reason = tbRoomMappingReason(location, roomMapping, confidentActualRoom);
    return {
      locationId: location.id,
      period,
      subject,
      teacher,
      status: '주의',
      reason,
      actualRoom: confidentActualRoom,
      roomMappingReason: reason,
      roomMappingConfidence,
      involvedGrades: roomMapping.involvedGrades,
      involvedClasses: roomMapping.involvedClasses,
      comciganRoom: roomMapping.comciganRoom,
    };
  }
  if (settings.examType === 'urine' && isSecondFloorLectureRoomSource(roomMapping, restriction)) {
    const reason = joinNotes(SECOND_FLOOR_LECTURE_ROOM_NOTE, isMixedGrade ? MIXED_GRADE_NOTE : undefined);
    return {
      locationId: location.id,
      period,
      subject: restriction?.subject || subject,
      teacher: restriction?.teacher || teacher,
      status: '주의',
      reason,
      actualRoom: displaySecondFloorLectureRoomName(confidentActualRoom),
      roomMappingReason: roomMapping ? reason : undefined,
      roomMappingConfidence,
      restrictedVenueName: restriction ? '2층 종합강의실' : undefined,
      restrictedVenueReason: restriction ? reason : undefined,
      comciganRoom: roomMapping?.comciganRoom,
    };
  }
  if (settings.examType === 'urine' && isMixedGrade) {
    if (settings.urineMixedGradeHandling === 'exclude') {
      return {
        locationId: location.id,
        period,
        subject,
        teacher,
        status: '불가',
        reason: MIXED_GRADE_NOTE,
        actualRoom: confidentActualRoom,
        roomMappingReason: MIXED_GRADE_NOTE,
        roomMappingConfidence,
        comciganRoom: roomMapping?.comciganRoom,
      };
    }
    if (settings.urineMixedGradeHandling === 'manual-confirm') {
      return {
        locationId: location.id,
        period,
        subject,
        teacher,
        status: '수동확인',
        reason: MIXED_GRADE_NOTE,
        actualRoom: confidentActualRoom,
        roomMappingReason: MIXED_GRADE_NOTE,
        roomMappingConfidence,
        comciganRoom: roomMapping?.comciganRoom,
      };
    }
    return {
      locationId: location.id,
      period,
      subject,
      teacher,
      status: '주의',
      reason: MIXED_GRADE_NOTE,
      actualRoom: confidentActualRoom,
      roomMappingReason: MIXED_GRADE_NOTE,
      roomMappingConfidence,
      comciganRoom: roomMapping?.comciganRoom,
    };
  }
  if (settings.examType === 'urine' && roomMapping?.urineExamAvailability === '불가') {
    return {
      locationId: location.id,
      period,
      subject,
      teacher,
      status: '불가',
      reason: [confidentActualRoom ? `실제 수업 교실: ${confidentActualRoom}` : '', roomMapping.reason || '실제 수업 교실 제한']
        .filter(Boolean)
        .join(' / '),
      actualRoom: confidentActualRoom,
      roomMappingReason: roomMapping.reason,
      roomMappingConfidence,
      comciganRoom: roomMapping.comciganRoom,
    };
  }
  if (settings.examType === 'urine' && restriction?.mode === '불가') {
    return {
      locationId: location.id,
      period,
      subject: restriction.subject || subject,
      teacher: restriction.teacher || teacher,
      status: '불가',
      reason: `검사 불가 장소: ${restriction.venueName} / ${restriction.reason || '장소 제한'}`,
      restrictedVenueName: restriction.venueName,
      restrictedVenueReason: restriction.reason || '장소 제한',
    };
  }
  if (settings.examType === 'urine' && roomMapping?.urineExamAvailability === '주의') {
    const mixedReason = roomMapping.isMixedClass ? '같은 학년 내 여러 학급 혼합 수업' : '';
    return {
      locationId: location.id,
      period,
      subject,
      teacher,
      status: '주의',
      reason: [confidentActualRoom ? `실제 수업 교실: ${confidentActualRoom}` : '', roomMapping.reason || mixedReason || '실제 수업 교실 확인 필요']
        .filter(Boolean)
        .join(' / '),
      actualRoom: confidentActualRoom,
      roomMappingReason: roomMapping.reason || mixedReason,
      roomMappingConfidence,
      comciganRoom: roomMapping.comciganRoom,
    };
  }
  if (settings.examType === 'urine' && restriction?.mode === '주의') {
    return {
      locationId: location.id,
      period,
      subject: restriction.subject || subject,
      teacher: restriction.teacher || teacher,
      status: '주의',
      reason: `주의 장소: ${restriction.venueName} / ${restriction.reason || '장소 확인 필요'}`,
      restrictedVenueName: restriction.venueName,
      restrictedVenueReason: restriction.reason || '장소 확인 필요',
    };
  }
  if (hasKeyword(subject, settings.cautionKeywords)) {
    return { locationId: location.id, period, subject, status: '주의', reason: `주의 키워드 포함: ${subject}` };
  }
  return { locationId: location.id, period, subject, status: '가능', reason: subject ? '일반 교실 수업' : '과목명 비어 있음' };
}

export function createJudgements(
  settings: ExamSettings,
  locations: VisitLocation[],
  timetables: TimetableRow[],
  restrictedVenueEntries: RestrictedVenueEntry[] = [],
  restrictedVenueWeekday: VenueRestrictionWeekday = 'auto',
  roomMappings: RoomMapping[] = [],
): PeriodJudgement[] {
  const restrictionMap = createRestrictionMap(settings, restrictedVenueEntries, restrictedVenueWeekday);
  return timetables.flatMap((row) => {
    const location = locations.find((item) => item.id === row.locationId || item.displayName === row.displayName);
    const className = normalizeClassName(row.displayName || location?.displayName || row.locationId);
    return Array.from({ length: 7 }, (_, index) =>
      judgePeriod(
        location,
        row,
        index + 1,
        settings,
        findRoomMapping(settings, roomMappings, location, row, index + 1),
        restrictionMap.get(`${className}|${index + 1}`),
      ),
    );
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
  const periodIndex = period ? period - 1 : -1;
  const rawText = periodIndex >= 0 ? row?.rawTexts?.[periodIndex] ?? '' : '';
  const parsedRaw = parseSubjectCell(rawText);
  const unitName = getUnitName(location);
  const homeRoomName = location.displayName;
  const actualRoomName = getActualRoomName(judgement);
  const displayVisitLocation = getDisplayVisitLocation(location, judgement);
  const homeRoomNote = actualRoomName && actualRoomName !== homeRoomName ? `기준 학급 ${unitName}` : undefined;
  const note = joinNotes(createAssignmentNote(manual, judgement), homeRoomNote);
  return {
    id: location.id,
    order,
    scheduledTime: manual?.scheduledTime || time,
    lineName: meta.lineName,
    timeBlockLabel: meta.timeBlockLabel,
    locationId: location.id,
    locationName: location.displayName,
    unitId: location.id,
    unitName,
    homeRoomName,
    actualRoomName,
    displayVisitLocation,
    grade: location.grade,
    period,
    subject: period ? row?.periods[period - 1] ?? parsedRaw.subject ?? judgement?.subject ?? '' : judgement?.subject ?? '',
    teacher: periodIndex >= 0 ? row?.teachers?.[periodIndex] || parsedRaw.teacher || '' : '',
    judgement: judgement?.status ?? '수동확인',
    isManual: Boolean(manual?.scheduledTime || manual?.period || manual?.excluded || manual?.locked || manual?.note),
    locked: Boolean(manual?.locked),
    excluded: Boolean(manual?.excluded),
    note,
    restrictedVenueName: judgement?.restrictedVenueName,
    restrictedVenueReason: judgement?.restrictedVenueReason,
    actualRoom: actualRoomName ?? judgement?.actualRoom,
    roomMappingReason: judgement?.roomMappingReason,
    roomMappingConfidence: judgement?.roomMappingConfidence,
    involvedGrades: judgement?.involvedGrades,
    involvedClasses: judgement?.involvedClasses,
    comciganRoom: judgement?.comciganRoom,
  };
}

export function createManualConfirmRows(divisions: SubjectDivision[], assignments: ScheduleAssignment[], judgements: PeriodJudgement[]) {
  const assignmentMap = new Map(assignments.map((item) => [item.locationId, item]));
  const divisionRows = divisions
    .filter((item) => !item.actualLocationId || item.handling === '자동제외')
    .map((item) => ({
      name: item.name,
      type: '선택과목 분반',
      reason: '실제 방문 장소 없음',
      required: '실제 수업 장소 확인 필요',
      actualLocation: item.actualLocationId,
      note: item.notes,
      grade: item.grade,
      unitName: item.name,
      period: '',
      subject: '',
      teacher: '',
      actualRoom: item.actualLocationId,
      involvedGrades: '',
      involvedClasses: '',
    }));

  const failedRows = assignments
    .filter((item) => item.failedReason)
    .map((item) => ({
      name: item.unitName || item.locationName,
      type: item.excluded ? '검사 제외' : '배정 실패',
      reason: item.failedReason ?? '',
      required: '다른 교시 또는 현장 수동 확인 필요',
      actualLocation: item.displayVisitLocation || item.locationId,
      note: item.note,
      grade: item.grade,
      unitName: item.unitName || item.locationName,
      period: item.period ? `${item.period}교시` : '',
      subject: item.subject,
      teacher: item.teacher ?? '',
      actualRoom: normalizeVisitRoomName(item.actualRoomName || item.actualRoom || ''),
      involvedGrades: (item.involvedGrades ?? []).join(', '),
      involvedClasses: (item.involvedClasses ?? []).join(', '),
    }));

  const blockedRows = judgements
    .filter((item) => item.status === '불가' || item.status === '수동확인')
    .map((item) => ({
      ...(() => {
        const assignment = assignmentMap.get(item.locationId);
        return {
          grade: assignment?.grade ?? '',
          unitName: assignment?.unitName ?? item.locationId,
        };
      })(),
      name: item.locationId,
      type: item.status === '수동확인' ? '혼합수업 확인' : item.actualRoom ? '실제 수업 교실' : item.restrictedVenueName ? '장소 제한' : '검사 불가',
      reason: item.reason,
      required: item.status === '수동확인' ? '호출 또는 검사 단위 확인 필요' : '다른 교시 배정 필요',
      actualLocation: item.locationId,
      period: `${item.period}교시`,
      subject: item.subject,
      teacher: item.teacher ?? '',
      actualRoom: normalizeVisitRoomName(item.actualRoom || item.restrictedVenueName || ''),
      involvedGrades: (item.involvedGrades ?? []).join(', '),
      involvedClasses: (item.involvedClasses ?? []).join(', '),
      note: [
        `${item.period}교시`,
        item.subject,
        item.teacher ? `교사: ${item.teacher}` : '',
        item.comciganRoom ? `컴시간 표시 교실: ${item.comciganRoom}` : '',
        item.actualRoom ? `실제 수업 교실: ${normalizeVisitRoomName(item.actualRoom)}` : '',
        item.roomMappingReason ? `실제교실 사유: ${item.roomMappingReason}` : '',
        item.restrictedVenueName ? `제한 장소: ${normalizeVisitRoomName(item.restrictedVenueName)}` : '',
        item.restrictedVenueReason ? `제한 사유: ${item.restrictedVenueReason}` : '',
      ]
        .filter(Boolean)
        .join(' / '),
    }));

  return [...divisionRows, ...failedRows, ...blockedRows];
}

export function makeSchedule(data: AppData): { judgements: PeriodJudgement[]; assignments: ScheduleAssignment[] } {
  const { settings, locations, timetables, manualOverrides } = data;
  const judgements = createJudgements(
    settings,
    locations,
    timetables,
    data.restrictedVenueEntries,
    data.restrictedVenueWeekday,
    data.roomMappingSettings?.enabled ? data.roomMappings : [],
  );
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
  } else if (settings.examType === 'tb' && settings.useGradeTimeBlocks && settings.gradeTimeMode !== 'ALL_GRADES_FULL_RANGE') {
    const effectiveBlocks = getEffectiveGradeTimeBlocks(settings);
    if (isCombinedGradeTimeMode(settings.gradeTimeMode)) {
      const block = effectiveBlocks[0];
      assignments.push(
        ...scheduleCandidateGroup({
          candidates,
          settings,
          timetableMap,
          manualOverrides,
          slotOptions: {
            startTime: block?.startTime ?? settings.startTime,
            endTime: block?.endTime ?? settings.endTime,
            lineCount: settings.teamCount,
          },
          lineName: getGradeTimeModeLabel(settings.gradeTimeMode),
          timeBlockLabel: block ? `${getGradeTimeModeLabel(settings.gradeTimeMode)} ${block.startTime}~${block.endTime}` : getGradeTimeModeLabel(settings.gradeTimeMode),
        }),
      );
    } else {
    for (const grade of getGrades(candidates)) {
      const block = effectiveBlocks.find((item) => item.grade === grade);
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
    const aAssigned = Boolean(a.order);
    const bAssigned = Boolean(b.order);
    if (aAssigned !== bAssigned) return aAssigned ? -1 : 1;
    const aTime = settings.examType === 'tb' ? a.callTime || a.scheduledTime : a.scheduledTime;
    const bTime = settings.examType === 'tb' ? b.callTime || b.scheduledTime : b.scheduledTime;
    const timeCompare = timeToMinutes(aTime || '23:59') - timeToMinutes(bTime || '23:59');
    if (timeCompare) return timeCompare;
    const lineCompare = lineRank(a.lineName) - lineRank(b.lineName);
    if (lineCompare) return lineCompare;
    return a.displayVisitLocation.localeCompare(b.displayVisitLocation, 'ko', { numeric: true });
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

function lineRank(lineName?: string) {
  if (lineName?.includes('2')) return 1;
  if (lineName?.includes('3')) return 2;
  return 9;
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
  const assignedUnitIds = new Set<string>();
  const assignedVisitLocationsByGrade = new Map<string, Set<string>>();

  const canAssign = (assignment: ScheduleAssignment) => {
    if (settings.examType !== 'urine') return true;
    const unitKey = assignment.unitId || assignment.locationId || assignment.unitName;
    const visitKey = normalizeVisitLocationKey(assignment.displayVisitLocation || assignment.homeRoomName);
    const grade = assignment.grade || 'unknown';
    if (assignedUnitIds.has(unitKey)) return false;
    if (visitKey && assignedVisitLocationsByGrade.get(grade)?.has(visitKey)) return false;
    return true;
  };

  const markAssigned = (assignment: ScheduleAssignment) => {
    if (settings.examType !== 'urine') return;
    const unitKey = assignment.unitId || assignment.locationId || assignment.unitName;
    const visitKey = normalizeVisitLocationKey(assignment.displayVisitLocation || assignment.homeRoomName);
    const grade = assignment.grade || 'unknown';
    assignedUnitIds.add(unitKey);
    if (!assignedVisitLocationsByGrade.has(grade)) assignedVisitLocationsByGrade.set(grade, new Set());
    if (visitKey) assignedVisitLocationsByGrade.get(grade)?.add(visitKey);
  };

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
    let selected:
      | { slot: Slot | undefined; slotIndex: number; judgement: PeriodJudgement | undefined; duplicate: boolean }
      | undefined;

    if (manual?.scheduledTime) {
      const judgement = preferred ?? valid[0];
      const preview = buildAssignment(location, row, judgement, null, manual.scheduledTime, manual, { lineName, timeBlockLabel });
      selected = { slot: undefined, slotIndex: -1, judgement, duplicate: !canAssign(preview) };
    } else {
      for (let index = 0; index < slots.length; index += 1) {
        const slot = slots[index];
        if (usedSlots.has(index) || (manual?.period && slot.period !== manual.period)) continue;
        const judgement = preferred ?? valid.find((item) => item.period === slot.period);
        if (!judgement) continue;
        const preview = buildAssignment(location, row, judgement, null, slot.time, manual, { lineName, timeBlockLabel });
        const duplicate = !canAssign(preview);
        selected = { slot, slotIndex: index, judgement, duplicate };
        if (!duplicate) break;
      }
    }

    const slot = selected?.slot;
    const slotIndex = selected?.slotIndex ?? -1;
    const judgement = selected?.judgement ?? preferred ?? valid[0];
    const assignment = buildAssignment(location, row, judgement, null, manual?.scheduledTime || slot?.time || '', manual, {
      lineName,
      timeBlockLabel,
    });

    if (!judgement) {
      assignment.failedReason = '검사 가능한 교시가 없음';
    } else if (!slot && !manual?.scheduledTime) {
      assignment.failedReason = settings.examType === 'tb' ? '학년별 검진 가능 시간 구간 안에 배정 불가' : '해당 학년 라인 시간 안에 배정 불가';
    } else if (selected?.duplicate) {
      assignment.failedReason = DUPLICATE_VISIT_LOCATION_NOTE;
      assignment.duplicateWarning = duplicateWarningText(assignment, assignments);
      appendNote(assignment, DUPLICATE_VISIT_LOCATION_NOTE);
    } else {
      assignment.order = assignments.filter((item) => item.order).length + 1;
      if (slotIndex >= 0) usedSlots.add(slotIndex);
      markAssigned(assignment);
    }
    if (slot?.isBreak) appendNote(assignment, '쉬는 시간 포함');
    enrichExamTimes(assignment, settings);
    assignments.push(assignment);
  }

  return assignments;
}

function duplicateWarningText(assignment: ScheduleAssignment, assignments: ScheduleAssignment[]) {
  const visitKey = normalizeVisitLocationKey(assignment.displayVisitLocation || assignment.homeRoomName);
  const matched = assignments.find(
    (item) =>
      item.order &&
      item.grade === assignment.grade &&
      normalizeVisitLocationKey(item.displayVisitLocation || item.homeRoomName) === visitKey,
  );
  if (!matched) return DUPLICATE_VISIT_LOCATION_NOTE;
  return `${DUPLICATE_VISIT_LOCATION_NOTE}: ${assignment.displayVisitLocation} / 기존 ${matched.unitName} ${matched.scheduledTime}`;
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
