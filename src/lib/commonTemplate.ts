import * as XLSX from 'xlsx';
import type { ExamSettings, LocationCategory, SubjectDivision, TimetableRow, VisitLocation } from '../types';
import { downloadText } from './csv';

export interface CommonImportRow {
  unit: string;
  grade: string;
  category: string;
  actualLocation: string;
  autoInclude: string;
  periods: string[];
  notes: string;
}

export interface ImportPreview {
  rows: CommonImportRow[];
  warnings: string[];
}

const COMMON_HEADERS = ['검사단위', '학년', '구분', '실제장소', '자동배정', '1교시', '2교시', '3교시', '4교시', '5교시', '6교시', '7교시', '비고'];
const REQUIRED_HEADERS = ['검사단위', '1교시', '2교시', '3교시'];

const EXAMPLE_ROWS = [
  ['2-1', '2', '일반학급', '2-1교실', '포함', '국어', '영어', '체육', '수학', '사회', '과학', '자율', ''],
  ['2-2', '2', '일반학급', '2-2교실', '포함', '수학', '정보', '국어', '영어', '과학', '사회', '자율', ''],
  ['2-13', '2', '선택분반', '', '제외', '선택A', '선택B', '', '', '', '', '', '실제 장소 없는 선택과목 분반'],
  ['3-1', '3', '일반학급', '3-1교실', '포함', '영어', '수학', '국어', '사회', '과학', '미술', '자율', ''],
];

export function downloadCommonTemplateXlsx() {
  const ws = XLSX.utils.aoa_to_sheet([
    ['개인정보 입력 금지: 학생 이름, 학번, 검사 결과, 질병명 등 개인정보는 입력하지 않습니다. 검사단위와 교시별 수업명만 입력하세요.'],
    [],
    COMMON_HEADERS,
    ...EXAMPLE_ROWS,
  ]);
  ws['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 12 } }];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, '시간표입력');
  XLSX.writeFile(wb, '검진검사_시간표_공통서식.xlsx');
}

export function downloadCommonTemplateCsv() {
  const csv = [COMMON_HEADERS, ...EXAMPLE_ROWS].map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(',')).join('\n');
  downloadText('검진검사_시간표_공통서식.csv', `\uFEFF${csv}`, 'text/csv;charset=utf-8');
}

export async function parseWorkbookFile(file: File, mode: 'common' | 'comcigan'): Promise<ImportPreview> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer);
  return mode === 'common' ? parseCommonWorkbook(workbook) : parseComciganWorkbook(workbook);
}

function parseCommonWorkbook(workbook: XLSX.WorkBook): ImportPreview {
  const sheet = workbook.Sheets['시간표입력'] ?? workbook.Sheets[workbook.SheetNames[0]];
  const raw = XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1, defval: '' });
  const headerIndex = raw.findIndex((row) => REQUIRED_HEADERS.every((header) => row.includes(header)));
  if (headerIndex < 0) {
    return { rows: [], warnings: [`필수 컬럼이 없습니다: ${REQUIRED_HEADERS.join(', ')}`] };
  }

  const headers = raw[headerIndex];
  const missing = REQUIRED_HEADERS.filter((header) => !headers.includes(header));
  if (missing.length) return { rows: [], warnings: [`필수 컬럼이 없습니다: ${missing.join(', ')}`] };

  const indexOf = (header: string) => headers.indexOf(header);
  const warnings: string[] = [];
  const rows = raw.slice(headerIndex + 1).flatMap((line, index) => {
    const unit = String(line[indexOf('검사단위')] ?? '').trim();
    if (!unit) {
      if (line.some(Boolean)) warnings.push(`${index + headerIndex + 2}행: 검사단위가 비어 있어 건너뜀`);
      return [];
    }
    return [{
      unit,
      grade: String(line[indexOf('학년')] ?? '').trim(),
      category: String(line[indexOf('구분')] ?? '일반학급').trim() || '일반학급',
      actualLocation: String(line[indexOf('실제장소')] ?? '').trim(),
      autoInclude: String(line[indexOf('자동배정')] ?? '포함').trim() || '포함',
      periods: Array.from({ length: 7 }, (_, period) => String(line[indexOf(`${period + 1}교시`)] ?? '').trim()),
      notes: String(line[indexOf('비고')] ?? '').trim(),
    }];
  });

  return { rows, warnings };
}

function parseComciganWorkbook(workbook: XLSX.WorkBook): ImportPreview {
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const raw = XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1, defval: '' });
  const rows: CommonImportRow[] = [];

  for (let r = 0; r < raw.length - 1; r += 1) {
    const name = String(raw[r]?.[0] ?? '').trim().replaceAll(' ', '');
    const day = String(raw[r + 1]?.[0] ?? '').trim();
    if (!/^[1-6]-\d+$/.test(name) || !day.startsWith('월')) continue;
    const [grade, klass] = name.split('-');
    const isDivision = klass === '13';
    rows.push({
      unit: name,
      grade,
      category: isDivision ? '선택분반' : '일반학급',
      actualLocation: isDivision ? '' : `${name}교실`,
      autoInclude: isDivision ? '제외' : '포함',
      periods: Array.from({ length: 7 }, (_, index) => String(raw[r + 1]?.[index + 1] ?? '').split('\n')[0].trim()),
      notes: isDivision ? '컴시간알리미 선택과목 분반, 실제 장소 확인 필요' : '컴시간알리미 엑셀 업로드',
    });
  }

  return { rows, warnings: rows.length ? [] : ['컴시간알리미 블록형 월요일 시간표를 찾지 못했습니다.'] };
}

function toCategory(value: string): LocationCategory {
  if (value === '특별실') return '특별실';
  if (value === '체육시설') return '체육시설';
  if (value === '수동확인') return '수동확인';
  if (value === '선택분반') return '선택과목 장소';
  return '일반교실';
}

export function convertPreviewToAppRows(rows: CommonImportRow[], settings: ExamSettings) {
  const locations: VisitLocation[] = [];
  const timetables: TimetableRow[] = [];
  const divisions: SubjectDivision[] = [];

  rows.forEach((row) => {
    const id = `U-${row.unit.replace(/[^0-9A-Za-z가-힣-]/g, '-')}`;
    const isExcluded = row.autoInclude === '제외';
    const isDivisionWithoutPlace = row.category === '선택분반' && !row.actualLocation;
    const displayName = settings.examType === 'urine' ? row.actualLocation || row.unit : row.unit;

    if (isDivisionWithoutPlace) {
      divisions.push({
        name: row.unit,
        grade: row.grade,
        actualLocationId: '',
        handling: '자동제외',
        notes: row.notes || '실제 방문 장소 없음',
      });
    }

    locations.push({
      id,
      displayName,
      grade: row.grade,
      category: toCategory(row.category),
      isVisitable: settings.examType === 'tb' || Boolean(row.actualLocation),
      includeInAuto: !isExcluded && !(settings.examType === 'urine' && !row.actualLocation),
      notes: row.notes,
    });

    timetables.push({
      locationId: id,
      displayName,
      periods: row.periods,
      notes: row.notes,
    });
  });

  return { locations, timetables, divisions };
}
