import type { HealthCheckStudent, HealthCheckStudentStatus, HealthCheckType } from '../../types/healthCheck';
import { normalizeHealthCheckType } from '../healthCheck';
import { localStorageAdapter } from '../storage/localStorageAdapter';
import { getSessionRosterStorageKey } from '../storage/storageKeys';
import { getStorageMode } from '../storage/storageProvider';
import { isSupabaseConfigured, supabase } from '../supabase/client';
import { getStudentSummary, updateStudentMemo, updateStudentStatus } from '../roster';

type StudentPatch = Partial<Pick<HealthCheckStudent, 'status' | 'memo'>>;

type HealthCheckStudentRow = {
  id: string;
  session_id: string;
  check_type: HealthCheckType;
  grade: string;
  class_name: string;
  number: string;
  name: string;
  status: HealthCheckStudentStatus;
  memo: string;
  updated_at: string;
};

const TABLE_NAME = 'health_check_students';
const STUDENT_STATUSES: HealthCheckStudentStatus[] = ['pending', 'completed', 'absent', 'earlyLeave', 'late', 'deferred'];

export class HealthCheckStudentRepository {
  async listBySession(sessionId: string, checkType: HealthCheckType): Promise<HealthCheckStudent[]> {
    return this.withSupabase(
      'list students',
      async () => {
        const client = requireSupabaseClient();
        const { data, error } = await client
          .from(TABLE_NAME)
          .select('*')
          .eq('session_id', sessionId)
          .order('class_name', { ascending: true })
          .order('number', { ascending: true })
          .order('name', { ascending: true });
        if (error) throw error;
        const students = ((data ?? []) as HealthCheckStudentRow[]).map((row) => fromRow(row, checkType)).sort(compareStudents);
        this.saveLocal(sessionId, checkType, students);
        return students;
      },
      () => this.listLocal(sessionId, checkType),
    );
  }

  async replaceForSession(sessionId: string, checkType: HealthCheckType, students: HealthCheckStudent[]): Promise<HealthCheckStudent[]> {
    const nextStudents = normalizeStudents(students, sessionId, checkType);
    return this.withSupabase(
      'replace students',
      async () => {
        const client = requireSupabaseClient();
        const { error: deleteError } = await client.from(TABLE_NAME).delete().eq('session_id', sessionId);
        if (deleteError) throw deleteError;
        if (nextStudents.length > 0) {
          const { error: insertError } = await client.from(TABLE_NAME).upsert(nextStudents.map(toRow), { onConflict: 'id' });
          if (insertError) throw insertError;
        }
        this.saveLocal(sessionId, checkType, nextStudents);
        return nextStudents;
      },
      () => this.replaceLocal(sessionId, checkType, nextStudents),
    );
  }

  async updateStudent(sessionId: string, checkType: HealthCheckType, studentId: string, patch: StudentPatch): Promise<HealthCheckStudent | undefined> {
    return this.withSupabase(
      'update student',
      async () => {
        const client = requireSupabaseClient();
        const { data, error } = await client
          .from(TABLE_NAME)
          .update(toPatchRow(patch))
          .eq('session_id', sessionId)
          .eq('id', studentId)
          .select('*')
          .maybeSingle();
        if (error) throw error;
        const updated = data ? fromRow(data as HealthCheckStudentRow, checkType) : undefined;
        if (updated) this.saveLocal(sessionId, checkType, this.listLocal(sessionId, checkType).map((student) => (student.id === studentId ? updated : student)));
        return updated;
      },
      () => this.updateLocal(sessionId, checkType, studentId, patch),
    );
  }

  async updateStatus(sessionId: string, checkType: HealthCheckType, studentId: string, status: HealthCheckStudentStatus) {
    return this.updateStudent(sessionId, checkType, studentId, { status });
  }

  async updateMemo(sessionId: string, checkType: HealthCheckType, studentId: string, memo: string) {
    return this.updateStudent(sessionId, checkType, studentId, { memo });
  }

  async deleteStudent(sessionId: string, checkType: HealthCheckType, studentId: string): Promise<HealthCheckStudent[]> {
    return this.withSupabase(
      'delete student',
      async () => {
        const client = requireSupabaseClient();
        const { error } = await client.from(TABLE_NAME).delete().eq('session_id', sessionId).eq('id', studentId);
        if (error) throw error;
        const next = this.listLocal(sessionId, checkType).filter((student) => student.id !== studentId);
        this.saveLocal(sessionId, checkType, next);
        return next;
      },
      () => this.deleteLocal(sessionId, checkType, studentId),
    );
  }

  async clearSession(sessionId: string, checkType: HealthCheckType): Promise<HealthCheckStudent[]> {
    return this.withSupabase(
      'clear students',
      async () => {
        const client = requireSupabaseClient();
        const { error } = await client.from(TABLE_NAME).delete().eq('session_id', sessionId);
        if (error) throw error;
        this.saveLocal(sessionId, checkType, []);
        return [];
      },
      () => this.replaceLocal(sessionId, checkType, []),
    );
  }

  async listByClass(sessionId: string, checkType: HealthCheckType, className: string) {
    const students = await this.listBySession(sessionId, checkType);
    return students.filter((student) => student.className === className);
  }

  async getSummary(sessionId: string, checkType: HealthCheckType) {
    const students = await this.listBySession(sessionId, checkType);
    return getStudentSummary(students);
  }

  private async withSupabase<T>(label: string, remote: () => Promise<T>, fallback: () => T | Promise<T>) {
    if (!shouldUseSupabaseStudents()) return fallback();
    try {
      return await remote();
    } catch (error) {
      console.warn(`[HealthCheckStudentRepository] Supabase ${label} failed. Falling back to localStorage.`, error);
      return fallback();
    }
  }

  private listLocal(sessionId: string, checkType: HealthCheckType) {
    try {
      const parsed = localStorageAdapter.getItem<Partial<HealthCheckStudent>[]>(getSessionRosterStorageKey(sessionId)) ?? [];
      return Array.isArray(parsed) ? normalizeStudents(parsed, sessionId, checkType) : [];
    } catch (error) {
      console.warn('[HealthCheckStudentRepository] Failed to read local students.', error);
      return [];
    }
  }

  private saveLocal(sessionId: string, checkType: HealthCheckType, students: HealthCheckStudent[]) {
    try {
      localStorageAdapter.setItem(getSessionRosterStorageKey(sessionId), normalizeStudents(students, sessionId, checkType));
    } catch (error) {
      console.warn('[HealthCheckStudentRepository] Failed to save local students.', error);
    }
  }

  private replaceLocal(sessionId: string, checkType: HealthCheckType, students: HealthCheckStudent[]) {
    const next = normalizeStudents(students, sessionId, checkType);
    this.saveLocal(sessionId, checkType, next);
    return next;
  }

  private updateLocal(sessionId: string, checkType: HealthCheckType, studentId: string, patch: StudentPatch) {
    const students = this.listLocal(sessionId, checkType);
    const next = patch.status
      ? updateStudentStatus(students, studentId, patch.status)
      : patch.memo !== undefined
        ? updateStudentMemo(students, studentId, patch.memo)
        : students;
    this.saveLocal(sessionId, checkType, next);
    return next.find((student) => student.id === studentId);
  }

  private deleteLocal(sessionId: string, checkType: HealthCheckType, studentId: string) {
    const next = this.listLocal(sessionId, checkType).filter((student) => student.id !== studentId);
    this.saveLocal(sessionId, checkType, next);
    return next;
  }
}

export const healthCheckStudentRepository = new HealthCheckStudentRepository();

function shouldUseSupabaseStudents() {
  return getStorageMode() === 'supabase' && isSupabaseConfigured() && Boolean(supabase);
}

function requireSupabaseClient() {
  if (!supabase) throw new Error('Supabase client is not configured.');
  return supabase;
}

function normalizeStudents(students: Partial<HealthCheckStudent>[], sessionId: string, checkType: HealthCheckType) {
  return students.map((student) => normalizeStudent(student, sessionId, checkType)).sort(compareStudents);
}

function normalizeStudent(student: Partial<HealthCheckStudent>, sessionId: string, checkType: HealthCheckType): HealthCheckStudent {
  const normalizedCheckType = normalizeHealthCheckType(student.checkType ?? checkType);
  const normalizedSessionId = String(student.sessionId || sessionId);
  const className = String(student.className || '');
  const number = String(student.number || '');
  const name = String(student.name || '');
  return {
    id: String(student.id || createStudentId(normalizedCheckType, normalizedSessionId, className, number, name)),
    sessionId: normalizedSessionId,
    checkType: normalizedCheckType,
    grade: String(student.grade || className.split('-')[0] || ''),
    className,
    number,
    name,
    status: normalizeStudentStatus(student.status),
    memo: String(student.memo || ''),
    updatedAt: String(student.updatedAt || new Date().toISOString()),
  };
}

function normalizeStudentStatus(status: unknown): HealthCheckStudentStatus {
  return STUDENT_STATUSES.includes(status as HealthCheckStudentStatus) ? (status as HealthCheckStudentStatus) : 'pending';
}

function createStudentId(checkType: HealthCheckType, sessionId: string, className: string, number: string, name: string) {
  return `${checkType}-${sessionId}-${className}-${number}-${name}`.replace(/[^0-9A-Za-z가-힣]/g, '-');
}

function compareStudents(a: HealthCheckStudent, b: HealthCheckStudent) {
  return a.className.localeCompare(b.className, 'ko', { numeric: true }) || Number(a.number) - Number(b.number) || a.name.localeCompare(b.name, 'ko');
}

function fromRow(row: HealthCheckStudentRow, checkType: HealthCheckType): HealthCheckStudent {
  return normalizeStudent(
    {
      id: row.id,
      sessionId: row.session_id,
      checkType: row.check_type,
      grade: row.grade,
      className: row.class_name,
      number: row.number,
      name: row.name,
      status: row.status,
      memo: row.memo,
      updatedAt: row.updated_at,
    },
    row.session_id,
    checkType,
  );
}

function toRow(student: HealthCheckStudent): HealthCheckStudentRow {
  return {
    id: student.id,
    session_id: student.sessionId,
    check_type: student.checkType,
    grade: student.grade,
    class_name: student.className,
    number: student.number,
    name: student.name,
    status: student.status,
    memo: student.memo,
    updated_at: student.updatedAt,
  };
}

function toPatchRow(patch: StudentPatch) {
  return {
    ...(patch.status !== undefined ? { status: normalizeStudentStatus(patch.status) } : {}),
    ...(patch.memo !== undefined ? { memo: patch.memo } : {}),
    updated_at: new Date().toISOString(),
  };
}
