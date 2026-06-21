import type { AppData, ExamSettings, ExportTable, ScheduleAssignment } from '../types';

const SECOND_FLOOR_LECTURE_ROOM_NOTE = '2층 종합강의실 수업 / 화장실 이동 안내 필요';
const MIXED_GRADE_NOTE = '혼합학년 수업 / 명렬표 확인 필요';
const VISIT_LOCATION_GUIDE = '교실/장소는 검사팀이 실제 방문할 수업 장소 기준으로 표시됩니다. 원래 학급 교실과 다를 수 있으며, 학생의 실제 반은 명렬표로 확인해 주세요.';
const NOTICE_LOCATION_GUIDE = '일부 이동수업·선택과목 수업은 원래 학급 교실이 아닌 실제 수업 장소 기준으로 표시됩니다.';

type VisitLocationDisplaySource = Pick<ScheduleAssignment, 'grade' | 'locationName' | 'actualRoom'> & {
  actualRoomName?: string;
  displayVisitLocation?: string;
  homeRoomName?: string;
  rawRoom?: string;
  unitName?: string;
};

function escapeCsv(value: string | number | null | undefined) {
  const text = String(value ?? '');
  return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function normalizeRoomText(value = '') {
  return value.replace(/\s/g, '').toUpperCase();
}

function joinNotes(...notes: Array<string | undefined>) {
  return [...new Set(notes.filter(Boolean))].join(' / ');
}

function visitLocation(item: ScheduleAssignment) {
  return formatVisitLocation(item);
}

function unitName(item: ScheduleAssignment) {
  return item.unitName || item.homeRoomName?.replace(/교실$/, '') || item.locationName.replace(/교실$/, '');
}

function isSecondFloorLectureRoomAssignment(item: ScheduleAssignment) {
  const actualRoom = normalizeRoomText(item.actualRoomName || item.actualRoom);
  const restrictedVenueName = normalizeRoomText(item.restrictedVenueName);
  const displayVisitLocation = normalizeRoomText(item.displayVisitLocation);
  return (
    actualRoom === '2층종합강의실' ||
    restrictedVenueName === '2층종합강의실' ||
    displayVisitLocation === '2층종합강의실' ||
    item.roomMappingReason === SECOND_FLOOR_LECTURE_ROOM_NOTE ||
    item.restrictedVenueReason === SECOND_FLOOR_LECTURE_ROOM_NOTE ||
    item.note.includes(SECOND_FLOOR_LECTURE_ROOM_NOTE)
  );
}

function isMixedGradeAssignment(item: ScheduleAssignment) {
  return item.roomMappingReason?.includes(MIXED_GRADE_NOTE) || item.note.includes(MIXED_GRADE_NOTE);
}

function displayNote(item: ScheduleAssignment) {
  if (item.failedReason) return item.failedReason;
  const specialNote = joinNotes(
    isSecondFloorLectureRoomAssignment(item) ? SECOND_FLOOR_LECTURE_ROOM_NOTE : undefined,
    isMixedGradeAssignment(item) ? MIXED_GRADE_NOTE : undefined,
  );
  return item.note || specialNote;
}

export function downloadText(filename: string, content: string, type = 'text/plain;charset=utf-8') {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function exportTableToCsv(table: ExportTable) {
  const rows = [table.headers, ...table.rows];
  const csv = rows.map((row) => row.map(escapeCsv).join(',')).join('\n');
  downloadText(`${table.name}.csv`, `\uFEFF${csv}`, 'text/csv;charset=utf-8');
}

export function formatVisitLocation(assignment: VisitLocationDisplaySource) {
  const grade = String(assignment.grade ?? '').trim();
  const fallback = formatHomeRoomName(assignment.homeRoomName || assignment.locationName || assignment.unitName, grade);
  const candidates = [
    assignment.actualRoomName,
    assignment.actualRoom,
    assignment.rawRoom,
    assignment.displayVisitLocation,
    assignment.locationName,
    assignment.unitName,
  ];

  for (const candidate of candidates) {
    const formatted = formatLocationCandidate(candidate, grade, fallback);
    if (formatted) return formatted;
  }

  return fallback || '';
}

function formatLocationCandidate(value: string | undefined, grade: string, fallback: string) {
  const text = String(value ?? '').trim();
  if (!text) return '';

  const lectureRoom = normalizeComprehensiveLectureRoom(text);
  if (lectureRoom) return lectureRoom;

  const classRoom = normalizeClassRoomName(text, grade);
  if (classRoom) return classRoom;

  if (/^\d+$/.test(text.replace(/\s/g, ''))) return fallback;
  return text;
}

function normalizeComprehensiveLectureRoom(value: string) {
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
    /^U-2-[123]$/.test(normalized) ||
    normalized.includes('2층중강') ||
    normalized.includes('2층종강') ||
    normalized.includes('2층종합강의실') ||
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

function normalizeClassRoomName(value: string, grade: string) {
  const text = value.trim();
  const compact = text.replace(/\s/g, '').replace(/교실$/, '');
  const code = compact.match(/^([23])(\d{2})$/);
  if (code) return `${code[1]}-${Number(code[2])}교실`;

  const dashed = compact.match(/^([1-6])-(\d{1,2})$/);
  if (dashed) return `${dashed[1]}-${Number(dashed[2])}교실`;

  const bareNumber = compact.match(/^(\d{1,2})$/);
  if (bareNumber && grade) return `${grade}-${Number(bareNumber[1])}교실`;

  return '';
}

function formatHomeRoomName(value: string | undefined, grade: string) {
  const text = String(value ?? '').trim();
  if (!text) return '';
  return normalizeClassRoomName(text, grade) || text;
}

export function createFullTable(assignments: ScheduleAssignment[], settings?: ExamSettings): ExportTable {
  if (settings?.examType === 'tb') {
    return {
      name: '결핵검진_자동배정표',
      headers: ['순서', '학년', '시간 구간', '호출 시간', '검진 예상 시간', '호출 단위', '검진 장소', '교시', '수업명', '판정', '수동수정 여부', '컴시간 표시 교실', '실제 수업 교실', '실제교실 사유', '비고'],
      rows: assignments.map((item) => [
        item.order?.toString() ?? '',
        item.grade,
        item.timeBlockLabel ?? '',
        item.callTime ?? '',
        item.examTime ?? item.scheduledTime,
        formatVisitLocation(item),
        item.examVenue || settings.examVenue,
        item.period ? `${item.period}교시` : '',
        item.subject,
        item.judgement,
        item.isManual ? '수동수정' : '',
        item.comciganRoom ?? '',
        item.actualRoom ?? '',
        item.roomMappingReason ?? '',
        displayNote(item),
      ]),
    };
  }

  return {
    name: '소변검사_자동배정표',
    headers: ['순서', '검사 라인', '학년', '검사 시간', '교실/장소', '기준 학급', '원래 학급 교실', '교시', '수업명', '교과교사', '판정', '수동수정 여부', '컴시간 표시 교실', '실제 수업 교실', '실제교실 사유', '제한 장소', '제한 사유', '비고'],
    rows: assignments.map((item) => [
      item.order?.toString() ?? '',
      item.lineName ?? '',
      item.grade,
      item.scheduledTime,
      formatVisitLocation(item),
      unitName(item),
      item.homeRoomName || item.locationName,
      item.period ? `${item.period}교시` : '',
      item.subject,
      item.teacher ?? '',
      item.judgement,
      item.isManual ? '수동수정' : '',
      item.comciganRoom ?? '',
      item.actualRoomName || item.actualRoom || '',
      item.roomMappingReason ?? '',
      item.restrictedVenueName ?? '',
      item.restrictedVenueReason ?? '',
      displayNote(item),
    ]),
  };
}

export function createLabTable(assignments: ScheduleAssignment[]): ExportTable {
  return {
    name: '임상병리사용_간단표',
    headers: ['순서', '검사 시간', '기준 학급', '실제 방문 장소', '수업명', '교과교사', '비고'],
    rows: assignments
      .filter((item) => item.order)
      .sort(sortByDisplayTime)
      .map((item) => [String(item.order), item.scheduledTime, unitName(item), formatVisitLocation(item), item.subject, item.teacher ?? '', displayNote(item)]),
  };
}

export function createUrineLineTables(assignments: ScheduleAssignment[]): ExportTable[] {
  const lineNames = [...new Set(assignments.filter((item) => item.order).map((item) => item.lineName || '통합 라인'))];
  return lineNames.map((lineName) => ({
    name: `소변검사_${lineName}_간단표`,
    headers: ['순서', '검사 시간', '기준 학급', '실제 방문 장소', '수업명', '교과교사', '비고'],
    rows: assignments
      .filter((item) => item.order && (item.lineName || '통합 라인') === lineName)
      .sort(sortByDisplayTime)
      .map((item) => [String(item.order), item.scheduledTime, unitName(item), formatVisitLocation(item), item.subject, item.teacher ?? '', displayNote(item)]),
  }));
}

export function createTbTeamTable(assignments: ScheduleAssignment[], settings?: ExamSettings): ExportTable {
  return {
    name: '결핵검진_검진팀용_간단표',
    headers: ['순서', '학년', '호출 시간', '검진 예상 시간', '호출 단위', '검진 장소', '비고'],
    rows: assignments
      .filter((item) => item.order)
      .sort(sortByDisplayTime)
      .map((item) => [
        String(item.order),
        item.grade,
        item.callTime ?? '',
        item.examTime ?? item.scheduledTime,
        formatVisitLocation(item),
        item.examVenue || settings?.examVenue || '',
        displayNote(item),
      ]),
  };
}

export function createTbGradeTables(assignments: ScheduleAssignment[], settings?: ExamSettings): ExportTable[] {
  const grades = [...new Set(assignments.filter((item) => item.order).map((item) => item.grade))].sort();
  return grades.map((grade) => ({
    name: `결핵검진_${grade}학년_검진팀용_간단표`,
    headers: ['순서', '호출 시간', '검진 예상 시간', '호출 단위', '검진 장소', '비고'],
    rows: assignments
      .filter((item) => item.order && item.grade === grade)
      .sort(sortByDisplayTime)
      .map((item) => [String(item.order), item.callTime ?? '', item.examTime ?? item.scheduledTime, formatVisitLocation(item), item.examVenue || settings?.examVenue || '', displayNote(item)]),
  }));
}

export function createUrineTwoColumnTable(assignments: ScheduleAssignment[], settings: ExamSettings): ExportTable {
  const grade2 = getUrineGradeRows(assignments, settings, '2');
  const grade3 = getUrineGradeRows(assignments, settings, '3');
  const maxRows = Math.max(grade2.length, grade3.length);

  return {
    name: '소변검사_학년별_2단표',
    headers: ['2학년 검진 시간', '2학년 교실/장소', '2학년 교과교사', '3학년 검진 시간', '3학년 교실/장소', '3학년 교과교사'],
    rows: Array.from({ length: maxRows }, (_, index) => [
      grade2[index]?.time ?? '',
      grade2[index]?.room ?? '',
      grade2[index]?.teacher ?? '',
      grade3[index]?.time ?? '',
      grade3[index]?.room ?? '',
      grade3[index]?.teacher ?? '',
    ]),
  };
}

function getUrineGradeRows(assignments: ScheduleAssignment[], settings: ExamSettings, grade: string) {
  return assignments
    .filter((item) => item.order && item.grade === grade)
    .sort((a, b) => (a.scheduledTime || '').localeCompare(b.scheduledTime || '') || visitLocation(a).localeCompare(visitLocation(b), 'ko', { numeric: true }))
    .map((item) => ({
      time: item.scheduledTime ? `${item.scheduledTime}~${addMinutes(item.scheduledTime, settings.durationMinutes)}` : '',
      room: formatVisitLocation(item),
      teacher: item.teacher ?? '',
    }));
}

function addMinutes(time: string, minutes: number) {
  const [hour = '0', minute = '0'] = time.split(':');
  const total = Number(hour) * 60 + Number(minute) + minutes;
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

function sortByDisplayTime(a: ScheduleAssignment, b: ScheduleAssignment) {
  const timeCompare = (a.callTime || a.scheduledTime || '23:59').localeCompare(b.callTime || b.scheduledTime || '23:59');
  if (timeCompare) return timeCompare;
  const lineCompare = lineRank(a.lineName) - lineRank(b.lineName);
  if (lineCompare) return lineCompare;
  return visitLocation(a).localeCompare(visitLocation(b), 'ko', { numeric: true });
}

function lineRank(lineName?: string) {
  if (lineName?.includes('2')) return 1;
  if (lineName?.includes('3')) return 2;
  return 9;
}

export function createTeacherTable(assignments: ScheduleAssignment[], settings?: ExamSettings): ExportTable {
  if (settings?.examType === 'tb') {
    return {
      name: '결핵검진_교사용_안내표',
      headers: ['학년', '시간 구간', '호출 단위', '호출 예정 시간', '검진 예상 시간', '검진 장소', '협조 요청 문구'],
      rows: assignments
        .filter((item) => item.order)
        .map((item) => [
          item.grade,
          item.timeBlockLabel ?? '',
          formatVisitLocation(item),
          item.callTime ?? '',
          item.examTime ?? item.scheduledTime,
          item.examVenue || settings.examVenue,
          '해당 시간 결핵검진을 위해 학생들이 검진 장소로 이동할 예정입니다. 학생들이 질서 있게 이동하고 검진 후 바로 수업에 복귀할 수 있도록 협조 부탁드립니다.',
        ]),
    };
  }

  return {
    name: '교사용_안내표',
    headers: ['방문 장소', '검사 예정 시간', '해당 교시', '협조 요청 문구'],
    rows: assignments
      .filter((item) => item.order)
      .map((item) => [
        formatVisitLocation(item),
        item.scheduledTime,
        item.period ? `${item.period}교시` : '',
        `해당 시간 소변검사팀이 방문할 예정입니다. 수업 중 학생들이 질서 있게 검사에 참여할 수 있도록 협조 부탁드립니다. ${NOTICE_LOCATION_GUIDE}`,
      ]),
  };
}

export function createUrineVisitLocationGuideTable(): ExportTable {
  return {
    name: '소변검사_장소표시_안내문',
    headers: ['안내'],
    rows: [[VISIT_LOCATION_GUIDE], [NOTICE_LOCATION_GUIDE]],
  };
}

export function downloadJsonBackup(data: AppData) {
  const prefix = data.settings.examType === 'tb' ? '결핵검진' : '소변검사';
  downloadText(`${prefix}_자동배정_백업_${data.settings.examDate || 'backup'}.json`, JSON.stringify(data, null, 2), 'application/json;charset=utf-8');
}
