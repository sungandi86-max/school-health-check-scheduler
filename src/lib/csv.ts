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
      headers: ['순서', '호출 시간', '검진 예상 시간', '호출 단위', '검진 장소', '해당 교시', '현재 수업', '판정', '비고'],
      rows: assignments.map((item) => [
        item.order?.toString() ?? '',
        item.callTime ?? '',
        item.examTime ?? item.scheduledTime,
        item.locationName,
        item.examVenue || settings.examVenue,
        item.period ? `${item.period}교시` : '',
        item.subject,
        item.judgement,
        item.failedReason || item.note,
      ]),
    };
  }

  return {
    name: '소변검사_자동배정표',
    headers: ['순서', '검사 예정 시간', '방문 장소', '해당 교시', '현재 수업', '판정', '비고'],
    rows: assignments.map((item) => [
      item.order?.toString() ?? '',
      item.scheduledTime,
      item.locationName,
      item.period ? `${item.period}교시` : '',
      item.subject,
      item.judgement,
      [item.isManual ? '수동수정' : '', item.failedReason || item.note].filter(Boolean).join(' / '),
    ]),
  };
}

export function createLabTable(assignments: ScheduleAssignment[]): ExportTable {
  return {
    name: '임상병리사용_간단표',
    headers: ['순서', '검사 예정 시간', '방문 장소', '현재 수업', '비고'],
    rows: assignments
      .filter((item) => item.order)
      .map((item) => [String(item.order), item.scheduledTime, item.locationName, item.subject, item.note]),
  };
}

export function createTeacherTable(assignments: ScheduleAssignment[], settings?: ExamSettings): ExportTable {
  if (settings?.examType === 'tb') {
    return {
      name: '결핵검진_교사용_안내표',
      headers: ['호출 단위', '호출 예정 시간', '검진 장소', '해당 교시', '협조 요청 문구'],
      rows: assignments
        .filter((item) => item.order)
        .map((item) => [
          item.locationName,
          item.callTime ?? '',
          item.examVenue || settings.examVenue,
          item.period ? `${item.period}교시` : '',
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
