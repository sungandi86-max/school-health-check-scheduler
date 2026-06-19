import * as XLSX from 'xlsx';
import type { RestrictedVenue, RestrictedVenueEntry, VenueRestrictionMode } from '../types';

type Weekday = '월' | '화' | '수' | '목' | '금';

export interface RestrictedVenueImportResult {
  venues: RestrictedVenue[];
  entries: RestrictedVenueEntry[];
  warnings: string[];
}

export async function parseRestrictedVenueWorkbook(file: File): Promise<RestrictedVenueImportResult> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer);
  const venues: RestrictedVenue[] = [];
  const entries: RestrictedVenueEntry[] = [];
  const warnings: string[] = [];

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: '' });
    const venue = parseVenueMeta(sheetName, rows);
    if (!venue) {
      warnings.push(`${sheetName}: 장소 정보를 찾지 못했습니다.`);
      continue;
    }
    venues.push(venue);

    const headerIndex = rows.findIndex((row) => row.some((cell) => String(cell).trim() === '교시'));
    if (headerIndex < 0) {
      warnings.push(`${sheetName}: 요일 헤더 행을 찾지 못했습니다.`);
      continue;
    }

    const headers = rows[headerIndex].map((cell) => String(cell ?? '').trim());
    const weekdayColumns = headers
      .map((header, index) => ({ weekday: parseWeekday(header), index }))
      .filter((item): item is { weekday: Weekday; index: number } => Boolean(item.weekday));

    for (const row of rows.slice(headerIndex + 1)) {
      const period = Number(row[0]);
      if (!Number.isInteger(period) || period < 1 || period > 7) continue;
      for (const { weekday, index } of weekdayColumns) {
        const parsed = parseVenueCell(row[index]);
        if (!parsed.className) continue;
        entries.push({
          venueId: venue.id,
          venueName: venue.name,
          floor: venue.floor,
          weekday,
          period,
          classCode: parsed.classCode,
          className: parsed.className,
          subject: parsed.subject,
          teacher: parsed.teacher,
          rawText: parsed.rawText,
          mode: venue.mode,
          reason: venue.note,
        });
      }
    }
  }

  return { venues, entries, warnings };
}

function parseVenueMeta(sheetName: string, rows: unknown[][]): RestrictedVenue | null {
  const title = [sheetName, ...rows.slice(0, 2).flat().map((cell) => String(cell ?? ''))].find((text) => /\d+\(.+?\)/.test(text));
  if (!title) return null;
  const match = title.match(/(\d+)\((.+?)\)/);
  if (!match) return null;
  const id = match[1];
  const rawName = match[2].replace(/\s/g, '');
  const name = displayVenueName(rawName);
  const floor = rawName.match(/(\d+층)/)?.[1] ?? (rawName.toUpperCase().startsWith('U-2-') ? '2층' : '');
  const mode = defaultModeForVenue(rawName);
  const isSecondFloor = rawName.includes('2층') || rawName.toUpperCase().startsWith('U-2-');
  return {
    id,
    name,
    floor,
    hasStudentRestroom: isComprehensiveLectureRoom(rawName) || !isSecondFloor,
    mode,
    note: isComprehensiveLectureRoom(rawName)
      ? '2층 종합강의실 수업 / 화장실 이동 안내 필요'
      : isSecondFloor
        ? '2층 학생 화장실 없음'
        : mode === '주의'
          ? '고층 이동 동선 확인 필요'
          : '',
  };
}

function defaultModeForVenue(name: string): VenueRestrictionMode {
  if (isComprehensiveLectureRoom(name)) return '주의';
  if (name.includes('2층')) return '불가';
  if (['컴퓨터실', '체육관', '운동장'].some((keyword) => name.includes(keyword))) return '불가';
  if (name.includes('5층')) return '주의';
  return '가능';
}

function isComprehensiveLectureRoom(name: string) {
  const normalized = name.replace(/\s/g, '').toUpperCase();
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

function displayVenueName(name: string) {
  return isComprehensiveLectureRoom(name) ? '2층 종합강의실' : name;
}

function parseWeekday(value: string): Weekday | null {
  const match = value.match(/[월화수목금]/);
  return (match?.[0] as Weekday | undefined) ?? null;
}

function parseVenueCell(value: unknown) {
  const rawText = String(value ?? '').replace(/\r/g, '\n').replace(/\n+/g, '\n').trim();
  const lines = rawText.split('\n').map((line) => line.trim()).filter(Boolean);
  const firstLine = lines[0] ?? '';
  const match = firstLine.match(/^(\d{3})(.*)$/);
  const classCode = match?.[1] ?? '';
  const subject = match?.[2]?.trim() ?? firstLine;
  return {
    rawText,
    classCode,
    className: normalizeClassCode(classCode),
    subject,
    teacher: lines[1] ?? '',
  };
}

function normalizeClassCode(classCode: string) {
  if (!/^\d{3}$/.test(classCode)) return '';
  const grade = classCode.slice(0, 1);
  const klass = Number(classCode.slice(1));
  if (!klass) return '';
  return `${grade}-${klass}`;
}
