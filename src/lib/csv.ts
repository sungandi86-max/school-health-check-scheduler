import type { AppData, ExamSettings, ExportTable, ScheduleAssignment } from '../types';

function escapeCsv(value: string | number | null | undefined) {
  const text = String(value ?? '');
  return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
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
        item.locationName,
        item.examVenue || settings.examVenue,
        item.period ? `${item.period}교시` : '',
        item.subject,
        item.judgement,
        item.isManual ? '수동수정' : '',
        item.comciganRoom ?? '',
        item.actualRoom ?? '',
        item.roomMappingReason ?? '',
        item.failedReason || item.note,
      ]),
    };
  }

  return {
    name: '소변검사_자동배정표',
    headers: ['순서', '검사 라인', '학년', '검사 시간', '교실/장소', '교시', '수업명', '판정', '수동수정 여부', '컴시간 표시 교실', '실제 수업 교실', '실제교실 사유', '제한 장소', '제한 사유', '비고'],
    rows: assignments.map((item) => [
      item.order?.toString() ?? '',
      item.lineName ?? '',
      item.grade,
      item.scheduledTime,
      item.locationName,
      item.period ? `${item.period}교시` : '',
      item.subject,
      item.judgement,
      item.isManual ? '수동수정' : '',
      item.comciganRoom ?? '',
      item.actualRoom ?? '',
      item.roomMappingReason ?? '',
      item.restrictedVenueName ?? '',
      item.restrictedVenueReason ?? '',
      item.failedReason || item.note,
    ]),
  };
}

export function createLabTable(assignments: ScheduleAssignment[]): ExportTable {
  return {
    name: '임상병리사용_간단표',
    headers: ['순서', '검사 라인', '검사 시간', '교실/장소', '수업명', '비고'],
    rows: assignments
      .filter((item) => item.order)
      .sort(sortByDisplayTime)
      .map((item) => [String(item.order), item.lineName ?? '', item.scheduledTime, item.locationName, item.subject, item.note]),
  };
}

export function createUrineLineTables(assignments: ScheduleAssignment[]): ExportTable[] {
  const lineNames = [...new Set(assignments.filter((item) => item.order).map((item) => item.lineName || '통합 라인'))];
  return lineNames.map((lineName) => ({
    name: `소변검사_${lineName}_간단표`,
    headers: ['순서', '검사 시간', '교실/장소', '수업명', '비고'],
    rows: assignments
      .filter((item) => item.order && (item.lineName || '통합 라인') === lineName)
      .sort(sortByDisplayTime)
      .map((item) => [String(item.order), item.scheduledTime, item.locationName, item.subject, item.note]),
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
        item.locationName,
        item.examVenue || settings?.examVenue || '',
        item.note,
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
      .map((item) => [String(item.order), item.callTime ?? '', item.examTime ?? item.scheduledTime, item.locationName, item.examVenue || settings?.examVenue || '', item.note]),
  }));
}

export function createUrineTwoColumnTable(assignments: ScheduleAssignment[], settings: ExamSettings): ExportTable {
  const grade2 = getUrineGradeRows(assignments, settings, '2');
  const grade3 = getUrineGradeRows(assignments, settings, '3');
  const maxRows = Math.max(grade2.length, grade3.length);

  return {
    name: '소변검사_학년별_2단표',
    headers: ['2학년 검진 시간', '2학년 교실', '2학년 교과교사', '3학년 검진 시간', '3학년 교실', '3학년 교과교사'],
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
    .sort((a, b) => (a.scheduledTime || '').localeCompare(b.scheduledTime || '') || a.locationName.localeCompare(b.locationName, 'ko', { numeric: true }))
    .map((item) => ({
      time: item.scheduledTime ? `${item.scheduledTime}~${addMinutes(item.scheduledTime, settings.durationMinutes)}` : '',
      room: item.locationName.replace(/교실$/, ''),
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
  return a.locationName.localeCompare(b.locationName, 'ko', { numeric: true });
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
          item.locationName,
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
        item.locationName,
        item.scheduledTime,
        item.period ? `${item.period}교시` : '',
        '해당 시간 소변검사팀이 방문할 예정입니다. 수업 중 학생들이 질서 있게 검사에 참여할 수 있도록 협조 부탁드립니다.',
      ]),
  };
}

export function downloadJsonBackup(data: AppData) {
  const prefix = data.settings.examType === 'tb' ? '결핵검진' : '소변검사';
  downloadText(`${prefix}_자동배정_백업_${data.settings.examDate || 'backup'}.json`, JSON.stringify(data, null, 2), 'application/json;charset=utf-8');
}
