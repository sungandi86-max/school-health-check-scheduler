import type {
  HealthCheckStudent,
  HealthCheckStudentStatus,
  HealthCheckType,
} from '../../types/healthCheck';
import { supabase } from '../supabase/client';

const TABLE_NAME = 'health_check_students';

interface HealthCheckStudentRow {
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
}

type HealthCheckStudentUpdate = Partial<Omit<HealthCheckStudent, 'id' | 'sessionId'>>;

function getSupabaseClient() {
  if (!supabase) {
    throw new Error(
      'Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY before using HealthCheckStudentRepository.',
    );
  }

  return supabase;
}

function fromRow(row: HealthCheckStudentRow): HealthCheckStudent {
  return {
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
  };
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

function toUpdateRow(patch: HealthCheckStudentUpdate): Partial<HealthCheckStudentRow> {
  const row: Partial<HealthCheckStudentRow> = {
    updated_at: patch.updatedAt ?? new Date().toISOString(),
  };

  if (patch.checkType !== undefined) row.check_type = patch.checkType;
  if (patch.grade !== undefined) row.grade = patch.grade;
  if (patch.className !== undefined) row.class_name = patch.className;
  if (patch.number !== undefined) row.number = patch.number;
  if (patch.name !== undefined) row.name = patch.name;
  if (patch.status !== undefined) row.status = patch.status;
  if (patch.memo !== undefined) row.memo = patch.memo;

  return row;
}

export async function listStudents(sessionId: string): Promise<HealthCheckStudent[]> {
  const client = getSupabaseClient();
  const { data, error } = await client
    .from(TABLE_NAME)
    .select('*')
    .eq('session_id', sessionId)
    .order('class_name', { ascending: true })
    .order('number', { ascending: true });

  if (error) {
    throw error;
  }

  return ((data ?? []) as HealthCheckStudentRow[]).map(fromRow);
}

export async function getStudent(id: string): Promise<HealthCheckStudent | null> {
  const client = getSupabaseClient();
  const { data, error } = await client
    .from(TABLE_NAME)
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data ? fromRow(data as HealthCheckStudentRow) : null;
}

export async function createStudent(student: HealthCheckStudent): Promise<HealthCheckStudent> {
  const client = getSupabaseClient();
  const { data, error } = await client
    .from(TABLE_NAME)
    .insert(toRow(student))
    .select('*')
    .single();

  if (error) {
    throw error;
  }

  return fromRow(data as HealthCheckStudentRow);
}

export async function updateStudent(
  id: string,
  patch: HealthCheckStudentUpdate,
): Promise<HealthCheckStudent> {
  const client = getSupabaseClient();
  const { data, error } = await client
    .from(TABLE_NAME)
    .update(toUpdateRow(patch))
    .eq('id', id)
    .select('*')
    .single();

  if (error) {
    throw error;
  }

  return fromRow(data as HealthCheckStudentRow);
}

export async function deleteStudent(id: string): Promise<void> {
  const client = getSupabaseClient();
  const { error } = await client.from(TABLE_NAME).delete().eq('id', id);

  if (error) {
    throw error;
  }
}

export async function replaceStudents(
  sessionId: string,
  students: HealthCheckStudent[],
): Promise<HealthCheckStudent[]> {
  const client = getSupabaseClient();
  const { error: deleteError } = await client
    .from(TABLE_NAME)
    .delete()
    .eq('session_id', sessionId);

  if (deleteError) {
    throw deleteError;
  }

  if (students.length === 0) {
    return [];
  }

  const rows = students.map((student) => toRow({ ...student, sessionId }));
  const { data, error } = await client.from(TABLE_NAME).insert(rows).select('*');

  if (error) {
    throw error;
  }

  return ((data ?? []) as HealthCheckStudentRow[]).map(fromRow);
}

export const healthCheckStudentRepository = {
  listBySession(sessionId: string, checkType?: HealthCheckType) {
    return listStudents(sessionId).then((students) =>
      checkType ? students.filter((student) => student.checkType === checkType) : students,
    );
  },

  replaceForSession(
    sessionId: string,
    checkType: HealthCheckType,
    students: HealthCheckStudent[],
  ) {
    return replaceStudents(
      sessionId,
      students.map((student) => ({ ...student, sessionId, checkType })),
    );
  },

  updateStatus(
    _sessionId: string,
    _checkType: HealthCheckType,
    studentId: string,
    status: HealthCheckStudentStatus,
  ) {
    return updateStudent(studentId, { status });
  },

  updateMemo(_sessionId: string, _checkType: HealthCheckType, studentId: string, memo: string) {
    return updateStudent(studentId, { memo });
  },
};
