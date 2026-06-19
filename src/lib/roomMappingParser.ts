import * as XLSX from 'xlsx';
import type { RoomMapping, UrineExamAvailability } from '../types';

export interface RoomMappingImportResult {
  mappings: RoomMapping[];
  warnings: string[];
  fileName: string;
}

const TEACHER_LABEL = '교사';
const ALLOCATION_LABEL = '배당표';
const ACTUAL_ROOM_LABEL = '실수업';
const MIXED_GRADE_NOTE = '혼합학년 수업 / 명렬표 확인 필요';

export async function parseRoomMappingWorkbook(file: File, selectedGrade = ''): Promise<RoomMappingImportResult> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer);
  const mappings: RoomMapping[] = [];
  const warnings: string[] = [];
  const fileGrade = selectedGrade || detectGrade(file.name);

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: '' });
    mappings.push(...parseGenericMappingRows(rows, sheetName, file.name, fileGrade));
    const actualRows = findLabelCells(rows, ACTUAL_ROOM_LABEL);
    if (!actualRows.length) continue;

    for (const actual of actualRows) {
      const labelColumn = actual.column;
      const actualRow = rows[actual.row];
      const allocationRow = findNearbyLabelRow(rows, actual.row, labelColumn, ALLOCATION_LABEL);
      const teacherRow = findNearbyLabelRow(rows, actual.row, labelColumn, TEACHER_LABEL);
      const headerRowIndex = findHeaderRow(rows, actual.row, labelColumn);
      const headerRow = headerRowIndex >= 0 ? rows[headerRowIndex] : [];
      if (!headerRow.length) {
        warnings.push(`${sheetName}: ${actual.row + 1}행의 실수업 과목 헤더를 찾지 못했습니다.`);
        continue;
      }

      for (let column = labelColumn + 1; column < Math.max(headerRow.length, actualRow.length); column += 1) {
        const divisionName = text(headerRow[column]);
        const rawActualRoom = text(actualRow[column]);
        const actualRoom = displayRoomName(rawActualRoom);
        if (!divisionName || !actualRoom) continue;

        const subjectName = normalizeSubjectName(divisionName);
        const comciganRoom = allocationRow ? text(allocationRow[column]) : '';
        const teacher = teacherRow ? text(teacherRow[column]) : '';
        const rawText = [sheetName, divisionName, subjectName, teacher, comciganRoom, rawActualRoom].filter(Boolean).join(' / ');
        const involvedClasses = collectInvolvedClasses({
          rows,
          headerRowIndex,
          actualRowIndex: actual.row,
          labelColumn,
          valueColumn: column,
          fallbackGrade: fileGrade,
          rawText,
        });
        const involvedGrades = collectInvolvedGrades(involvedClasses, fileGrade, rawText);
        const mixed = judgeMixed(involvedGrades, involvedClasses);
        const roomRule = judgeRoom(actualRoom);
        const availability = chooseAvailability(roomRule.availability, mixed.isMixedGrade, mixed.isMixedClass);
        const reason = chooseReason(roomRule.reason, availability, mixed);

        mappings.push({
          id: `map-${file.name}-${sheetName}-${actual.row}-${column}`.replace(/\s+/g, '-'),
          grade: fileGrade || involvedGrades[0] || '',
          subjectName,
          divisionName,
          comciganRoom,
          actualRoom,
          floor: detectFloor(rawActualRoom || actualRoom),
          restroomAccessible: availability !== '불가' && !isRestroomBlockedRoom(rawActualRoom || actualRoom),
          urineExamAvailability: availability,
          reason,
          sourceFile: file.name,
          rawText,
          teacher,
          involvedGrades,
          involvedClasses,
          isMixedGrade: mixed.isMixedGrade,
          isMixedClass: mixed.isMixedClass,
          mixedReason: mixed.reason,
        });
      }
    }
  }

  if (!mappings.length) {
    warnings.push(`${file.name}: 실수업/배당표 요약 행을 찾지 못했습니다. 분반자료 양식을 확인해 주세요.`);
  }

  return { mappings: dedupeMappings(mappings), warnings, fileName: file.name };
}

function parseGenericMappingRows(rows: unknown[][], sheetName: string, fileName: string, fileGrade: string): RoomMapping[] {
  const headerIndex = rows.findIndex((row) => {
    const headers = row.map((cell) => normalizeHeader(text(cell)));
    return findColumn(headers, ACTUAL_ROOM_HEADERS) >= 0 && (findColumn(headers, SUBJECT_HEADERS) >= 0 || findColumn(headers, DIVISION_HEADERS) >= 0);
  });
  if (headerIndex < 0) return [];

  const headers = rows[headerIndex].map((cell) => normalizeHeader(text(cell)));
  const columns = {
    grade: findColumn(headers, GRADE_HEADERS),
    subject: findColumn(headers, SUBJECT_HEADERS),
    division: findColumn(headers, DIVISION_HEADERS),
    comciganRoom: findColumn(headers, COMCIGAN_ROOM_HEADERS),
    actualRoom: findColumn(headers, ACTUAL_ROOM_HEADERS),
    floor: findColumn(headers, FLOOR_HEADERS),
    classes: findColumn(headers, CLASS_HEADERS),
  };

  return rows.slice(headerIndex + 1).flatMap((row, offset) => {
    const rawActualRoom = text(row[columns.actualRoom]);
    const actualRoom = displayRoomName(rawActualRoom);
    if (!actualRoom) return [];
    const rawText = row.map(text).filter(Boolean).join(' / ');
    const subjectName = text(row[columns.subject]);
    const divisionName = text(row[columns.division]);
    const grade = text(row[columns.grade]) || fileGrade || detectGrade(rawText);
    const involvedClasses = extractClassNames([text(row[columns.classes]), rawText].filter(Boolean).join(' '));
    const involvedGrades = collectInvolvedGrades(involvedClasses, grade, rawText);
    const mixed = judgeMixed(involvedGrades, involvedClasses);
    const roomRule = judgeRoom(actualRoom);
    const availability = chooseAvailability(roomRule.availability, mixed.isMixedGrade, mixed.isMixedClass);
    const reason = chooseReason(roomRule.reason, availability, mixed);
    return [{
      id: `map-${fileName}-${sheetName}-generic-${headerIndex + offset}`.replace(/\s+/g, '-'),
      grade,
      subjectName: subjectName || normalizeSubjectName(divisionName),
      divisionName,
      comciganRoom: text(row[columns.comciganRoom]),
      actualRoom,
      floor: text(row[columns.floor]) || detectFloor(rawActualRoom || actualRoom),
      restroomAccessible: availability !== '불가' && !isRestroomBlockedRoom(rawActualRoom || actualRoom),
      urineExamAvailability: availability,
      reason,
      sourceFile: fileName,
      rawText,
      involvedGrades,
      involvedClasses,
      isMixedGrade: mixed.isMixedGrade,
      isMixedClass: mixed.isMixedClass,
      mixedReason: mixed.reason,
    } satisfies RoomMapping];
  });
}

const COMCIGAN_ROOM_HEADERS = ['컴시간', '컴시간교실', '컴시간알리미', '표시교실', '시간표상교실', '분반명', '교실'];
const ACTUAL_ROOM_HEADERS = ['실제교실', '실제수업교실', '실수업교실', '수업교실', '실제장소', '실제수업장소'];
const SUBJECT_HEADERS = ['과목', '과목명', '수업명'];
const DIVISION_HEADERS = ['분반', '분반명', '선택반', '이동수업'];
const GRADE_HEADERS = ['학년'];
const FLOOR_HEADERS = ['층', '층정보'];
const CLASS_HEADERS = ['학급', '포함학급', '대상학급', '반'];

function normalizeHeader(value: string) {
  return value.replace(/\s/g, '').toLowerCase();
}

function findColumn(headers: string[], candidates: string[]) {
  return headers.findIndex((header) => candidates.some((candidate) => header.includes(normalizeHeader(candidate))));
}

function findLabelCells(rows: unknown[][], label: string) {
  const cells: { row: number; column: number }[] = [];
  rows.forEach((row, rowIndex) => {
    row.forEach((cell, column) => {
      if (text(cell) === label) cells.push({ row: rowIndex, column });
    });
  });
  return cells;
}

function findNearbyLabelRow(rows: unknown[][], startRow: number, column: number, label: string) {
  for (let row = startRow - 1; row >= Math.max(0, startRow - 6); row -= 1) {
    if (text(rows[row]?.[column]) === label) return rows[row];
  }
  for (let row = startRow + 1; row <= Math.min(rows.length - 1, startRow + 3); row += 1) {
    if (text(rows[row]?.[column]) === label) return rows[row];
  }
  return undefined;
}

function findHeaderRow(rows: unknown[][], startRow: number, labelColumn: number) {
  for (let row = startRow - 1; row >= Math.max(0, startRow - 25); row -= 1) {
    const label = text(rows[row]?.[labelColumn]);
    const subjectCount = rows[row]
      ?.slice(labelColumn + 1)
      .filter((cell) => looksLikeSubjectHeader(text(cell))).length ?? 0;
    if (subjectCount >= 2 && (label.includes('그룹') || row === 0 || /^[A-Z]\s*그룹$/i.test(label))) return row;
  }
  return -1;
}

function looksLikeSubjectHeader(value: string) {
  if (!value) return false;
  if ([TEACHER_LABEL, ALLOCATION_LABEL, ACTUAL_ROOM_LABEL, '소계'].includes(value)) return false;
  return /[가-힣A-Za-z]/.test(value);
}

function collectInvolvedClasses({
  rows,
  headerRowIndex,
  actualRowIndex,
  labelColumn,
  valueColumn,
  fallbackGrade,
  rawText,
}: {
  rows: unknown[][];
  headerRowIndex: number;
  actualRowIndex: number;
  labelColumn: number;
  valueColumn: number;
  fallbackGrade: string;
  rawText: string;
}) {
  const classes = new Set<string>();

  for (let row = headerRowIndex + 1; row < actualRowIndex; row += 1) {
    const label = text(rows[row]?.[labelColumn]);
    const count = Number(rows[row]?.[valueColumn]);
    const className = classFromLabel(label, fallbackGrade);
    if (className && Number.isFinite(count) && count > 0) classes.add(className);
  }

  for (const className of extractClassNames(rawText)) {
    classes.add(className);
  }

  return [...classes].sort((a, b) => a.localeCompare(b, 'ko', { numeric: true }));
}

function collectInvolvedGrades(classes: string[], fallbackGrade: string, rawText: string) {
  const grades = new Set(classes.map((className) => className.split('-')[0]).filter(Boolean));
  for (const match of rawText.matchAll(/([1-6])\s*학년/g)) {
    grades.add(match[1]);
  }
  if (!grades.size && fallbackGrade) grades.add(fallbackGrade);
  return [...grades].sort((a, b) => a.localeCompare(b, 'ko', { numeric: true }));
}

function extractClassNames(value: string) {
  const classes = new Set<string>();
  for (const match of value.matchAll(/\b([1-6])\s*-\s*(\d{1,2})\b/g)) {
    const grade = match[1];
    const klass = Number(match[2]);
    if (klass >= 1 && klass <= 20) classes.add(`${grade}-${klass}`);
  }
  for (const match of value.matchAll(/\b([1-6]\d{2})\b/g)) {
    const code = match[1];
    const klass = Number(code.slice(1));
    if (klass >= 1 && klass <= 20) classes.add(`${code[0]}-${klass}`);
  }
  return [...classes];
}

function classFromLabel(label: string, fallbackGrade: string) {
  const dashed = label.match(/^([1-6])\s*-\s*(\d{1,2})/);
  if (dashed) return `${dashed[1]}-${Number(dashed[2])}`;
  const klass = label.match(/^(\d{1,2})\s*반$/);
  if (klass && fallbackGrade) return `${fallbackGrade}-${Number(klass[1])}`;
  const code = label.match(/^([1-6]\d{2})$/);
  if (code) return `${code[1][0]}-${Number(code[1].slice(1))}`;
  return '';
}

function judgeMixed(involvedGrades: string[], involvedClasses: string[]) {
  const isMixedGrade = involvedGrades.length >= 2;
  const isMixedClass = involvedClasses.length >= 2;
  const reason = isMixedGrade
    ? MIXED_GRADE_NOTE
    : isMixedClass
      ? '같은 학년 내 여러 학급 혼합 수업'
      : '';
  return { isMixedGrade, isMixedClass, reason };
}

function chooseAvailability(roomAvailability: UrineExamAvailability, isMixedGrade: boolean, isMixedClass: boolean): UrineExamAvailability {
  if (roomAvailability === '불가') return '불가';
  if (roomAvailability === '주의') return '주의';
  if (isMixedGrade) return '주의';
  if (isMixedClass) return '주의';
  return '가능';
}

function chooseReason(roomReason: string, availability: UrineExamAvailability, mixed: ReturnType<typeof judgeMixed>) {
  if (roomReason && availability === '불가') return roomReason;
  if (mixed.isMixedGrade) return [roomReason, MIXED_GRADE_NOTE].filter(Boolean).join(' / ');
  if (roomReason) return roomReason;
  if (mixed.isMixedClass) return '같은 학년 내 여러 학급 혼합 수업';
  return '';
}

function judgeRoom(room: string): { availability: UrineExamAvailability; reason: string } {
  const normalized = room.replace(/\s/g, '');
  if (isComprehensiveLectureRoom(room)) {
    return { availability: '주의', reason: '2층 종합강의실 수업 / 화장실 이동 안내 필요' };
  }
  if (isRestroomBlockedRoom(room)) return { availability: '불가', reason: '학생 화장실 접근 어려움' };
  if (['컴퓨터실', '체육관', '운동장'].some((keyword) => normalized.includes(keyword))) {
    return { availability: '불가', reason: '소변검사 진행이 어려운 장소' };
  }
  if (normalized.includes('5층')) return { availability: '주의', reason: '고층 이동 동선 확인 필요' };
  return { availability: '가능', reason: '' };
}

function isRestroomBlockedRoom(room: string) {
  const normalized = room.replace(/\s/g, '');
  if (isComprehensiveLectureRoom(room)) return false;
  return normalized.includes('2층') || ['2층종강', '종강1', '종강2'].some((keyword) => normalized.includes(keyword));
}

function isComprehensiveLectureRoom(room: string) {
  const normalized = room.replace(/\s/g, '').toUpperCase();
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

function displayRoomName(room: string) {
  return isComprehensiveLectureRoom(room) ? '2층 종합강의실' : room;
}

function detectGrade(value: string) {
  return value.match(/([1-6])\s*학년/)?.[1] ?? '';
}

function detectFloor(value: string) {
  return value.match(/([1-9]\s*층)/)?.[1]?.replace(/\s/g, '') ?? '';
}

function normalizeSubjectName(value: string) {
  return value.replace(/[A-Z]\d?$/i, '').trim() || value;
}

function dedupeMappings(mappings: RoomMapping[]) {
  const seen = new Set<string>();
  return mappings.filter((mapping) => {
    const key = [mapping.grade, mapping.divisionName, mapping.comciganRoom, mapping.actualRoom, mapping.teacher, mapping.sourceFile].join('|');
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function text(value: unknown) {
  return String(value ?? '').replace(/\r/g, '\n').replace(/\n+/g, '\n').trim();
}
