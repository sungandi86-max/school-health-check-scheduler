import * as XLSX from 'xlsx';
import type { HealthCheckStudent, HealthCheckStudentStatus, HealthCheckType } from '../types/healthCheck';

export const STUDENT_STATUS_LABELS: Record<HealthCheckStudentStatus, string> = {
  pending: '대기',
  completed: '완료',
  absent: '결석',
  earlyLeave: '조퇴',
  late: '지각',
  deferred: '추후검진',
};

export const STUDENT_STATUS_OPTIONS: HealthCheckStudentStatus[] = ['completed', 'absent', 'earlyLeave', 'late', 'deferred'];

export function getRosterStorageKey(checkType: HealthCheckType) {
  return `schoolHealthHub.students.${checkType}`;
}

export function getSessionRosterStorageKey(sessionId: string) {
  return `schoolHealthHub.students.${sessionId}`;
}

export function loadRosterStudents(checkType: HealthCheckType, sessionId?: string): HealthCheckStudent[] {
  if (typeof localStorage === 'undefined') return [];
  try {
    const key = sessionId ? getSessionRosterStorageKey(sessionId) : getRosterStorageKey(checkType);
    const parsed = JSON.parse(localStorage.getItem(key) || '[]') as HealthCheckStudent[];
    return Array.isArray(parsed) ? parsed.map((student) => normalizeStudent(student, checkType)) : [];
  } catch {
    return [];
  }
}

export function saveRosterStudents(checkType: HealthCheckType, students: HealthCheckStudent[], sessionId?: string) {
  const key = sessionId ? getSessionRosterStorageKey(sessionId) : getRosterStorageKey(checkType);
  localStorage.setItem(key, JSON.stringify(students.map((student) => normalizeStudent(student, checkType))));
}

export function getStudentsBySession(sessionId: string, checkType: HealthCheckType): HealthCheckStudent[] {
  return loadRosterStudents(checkType, sessionId);
}

export function saveStudentsBySession(sessionId: string, checkType: HealthCheckType, students: HealthCheckStudent[]) {
  saveRosterStudents(checkType, students, sessionId);
}

export async function parseRosterFile(file: File, checkType: HealthCheckType, sessionId: string): Promise<HealthCheckStudent[]> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });
  return parseRosterWorkbook(workbook, checkType, sessionId);
}

export function parseRosterWorkbook(workbook: XLSX.WorkBook, checkType: HealthCheckType, sessionId: string): HealthCheckStudent[] {
  const now = new Date().toISOString();
  const students: HealthCheckStudent[] = [];

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json<Array<string | number | null>>(sheet, { header: 1, raw: false, defval: '' });
    const headerIndex = findHeaderRow(rows);
    if (headerIndex < 0) continue;

    const headers = rows[headerIndex].map((cell) => normalizeHeader(cell));
    const indexes = {
      grade: findHeaderIndex(headers, ['학년', 'grade', 'gr']),
      className: findHeaderIndex(headers, ['반', 'class', '학급', 'classroom']),
      number: findHeaderIndex(headers, ['번호', 'number', 'no', 'num', '번']),
      name: findHeaderIndex(headers, ['이름', 'name', '성명', '학생명']),
    };

    if (indexes.name < 0 || indexes.number < 0) continue;

    for (const row of rows.slice(headerIndex + 1)) {
      const name = cellText(row[indexes.name]);
      if (!name || /합계|총원|계\b/i.test(name)) continue;

      const grade = indexes.grade >= 0 ? onlyNumber(cellText(row[indexes.grade])) : inferGrade(sheetName);
      const classNumber = indexes.className >= 0 ? onlyNumber(cellText(row[indexes.className])) : inferClass(sheetName);
      const className = normalizeClassName(grade, classNumber, cellText(row[indexes.className]));
      const number = onlyNumber(cellText(row[indexes.number])) || cellText(row[indexes.number]);
      if (!className || !number) continue;

      students.push({
        id: createStudentId(checkType, sessionId, className, number, name),
        sessionId,
        checkType,
        grade: grade || className.split('-')[0] || '',
        className,
        number,
        name,
        status: 'pending',
        memo: '',
        updatedAt: now,
      });
    }
  }

  return dedupeStudents(students).sort(compareStudents);
}

export function updateRosterStudent(
  students: HealthCheckStudent[],
  studentId: string,
  patch: Partial<Pick<HealthCheckStudent, 'status' | 'memo'>>,
) {
  const updatedAt = new Date().toISOString();
  return students.map((student) => (student.id === studentId ? { ...student, ...patch, updatedAt } : student));
}

export function updateStudentStatus(students: HealthCheckStudent[], studentId: string, status: HealthCheckStudentStatus) {
  return updateRosterStudent(students, studentId, { status });
}

export function updateStudentMemo(students: HealthCheckStudent[], studentId: string, memo: string) {
  return updateRosterStudent(students, studentId, { memo });
}

export function getRosterClasses(students: HealthCheckStudent[]) {
  return [...new Set(students.map((student) => student.className).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'ko', { numeric: true }));
}

export function getClassesFromStudents(students: HealthCheckStudent[]) {
  return getRosterClasses(students);
}

export function getRosterSummary(students: HealthCheckStudent[]) {
  const byStatus = Object.fromEntries(
    (['pending', 'completed', 'absent', 'earlyLeave', 'late', 'deferred'] as HealthCheckStudentStatus[]).map((status) => [
      status,
      students.filter((student) => student.status === status).length,
    ]),
  ) as Record<HealthCheckStudentStatus, number>;
  const completed = byStatus.completed;
  const incomplete = students.length - completed;

  return {
    total: students.length,
    classCount: getRosterClasses(students).length,
    completed,
    incomplete,
    byStatus,
  };
}

export function getStudentSummary(students: HealthCheckStudent[]) {
  return getRosterSummary(students);
}

function normalizeStudent(student: Partial<HealthCheckStudent>, checkType: HealthCheckType): HealthCheckStudent {
  const status = isStudentStatus(student.status) ? student.status : 'pending';
  return {
    id: String(student.id || `${checkType}-${student.className || 'class'}-${student.number || '0'}-${student.name || 'student'}`),
    sessionId: String(student.sessionId || `${checkType}-local-session`),
    checkType,
    grade: String(student.grade || ''),
    className: String(student.className || ''),
    number: String(student.number || ''),
    name: String(student.name || ''),
    status,
    memo: String(student.memo || ''),
    updatedAt: String(student.updatedAt || new Date().toISOString()),
  };
}

function isStudentStatus(value: unknown): value is HealthCheckStudentStatus {
  return ['pending', 'completed', 'absent', 'earlyLeave', 'late', 'deferred'].includes(String(value));
}

function findHeaderRow(rows: Array<Array<string | number | null>>) {
  return rows.findIndex((row) => {
    const headers = row.map((cell) => normalizeHeader(cell));
    return findHeaderIndex(headers, ['이름', 'name', '성명', '학생명']) >= 0 && findHeaderIndex(headers, ['번호', 'number', 'no', 'num', '번']) >= 0;
  });
}

function findHeaderIndex(headers: string[], candidates: string[]) {
  return headers.findIndex((header) => candidates.some((candidate) => header === normalizeHeader(candidate) || header.includes(normalizeHeader(candidate))));
}

function normalizeHeader(value: unknown) {
  return String(value ?? '').replace(/\s/g, '').trim().toLowerCase();
}

function cellText(value: unknown) {
  return String(value ?? '').trim();
}

function onlyNumber(value: string) {
  return value.match(/\d+/)?.[0] ?? '';
}

function inferGrade(sheetName: string) {
  return sheetName.match(/([1-6])\s*학년/)?.[1] ?? sheetName.match(/^([1-6])/)?.[1] ?? '';
}

function inferClass(sheetName: string) {
  return sheetName.match(/([0-9]+)\s*반/)?.[1] ?? sheetName.match(/[1-6]\D+([0-9]{1,2})/)?.[1] ?? '';
}

function normalizeClassName(grade: string, classNumber: string, rawClass: string) {
  if (grade && classNumber) return `${Number(grade)}-${Number(classNumber)}`;
  const compact = rawClass.replace(/\s/g, '');
  const dashed = compact.match(/([1-6])[-학년]+([0-9]{1,2})/);
  if (dashed) return `${Number(dashed[1])}-${Number(dashed[2])}`;
  return compact;
}

function createStudentId(checkType: HealthCheckType, sessionId: string, className: string, number: string, name: string) {
  return `${checkType}-${sessionId}-${className}-${number}-${name}`.replace(/[^0-9A-Za-z가-힣-]/g, '-');
}

function dedupeStudents(students: HealthCheckStudent[]) {
  const seen = new Set<string>();
  return students.filter((student) => {
    const key = `${student.checkType}|${student.sessionId}|${student.className}|${student.number}|${student.name}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function compareStudents(a: HealthCheckStudent, b: HealthCheckStudent) {
  return a.className.localeCompare(b.className, 'ko', { numeric: true }) || Number(a.number) - Number(b.number) || a.name.localeCompare(b.name, 'ko');
}
