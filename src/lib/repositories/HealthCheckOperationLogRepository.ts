import type {
  HealthCheckOperationLog,
  HealthCheckOperationLogType,
} from '../../types/healthCheck';
import type { HealthCheckOperationLogInput } from '../logs';
import { supabase } from '../supabase/client';

const TABLE_NAME = 'health_check_operation_logs';
const LOG_TYPES: HealthCheckOperationLogType[] = [
  'sessionStarted',
  'classStarted',
  'classCompleted',
  'classMissing',
  'classMissingCleared',
  'studentStatusChanged',
  'delayUpdated',
  'noticeGenerated',
  'memoUpdated',
  'manualNote',
];

interface HealthCheckOperationLogRow {
  id: string;
  session_id: string;
  type: HealthCheckOperationLogType;
  message: string;
  related_class_id: string | null;
  related_student_id: string | null;
  created_at: string;
}

function getSupabaseClient() {
  if (!supabase) {
    throw new Error(
      'Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY before using HealthCheckOperationLogRepository.',
    );
  }

  return supabase;
}

function normalizeLog(log: HealthCheckOperationLog): HealthCheckOperationLog {
  return {
    id: String(log.id || `log-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`),
    sessionId: String(log.sessionId || ''),
    type: normalizeLogType(log.type),
    message: String(log.message || ''),
    relatedClassId: log.relatedClassId ? String(log.relatedClassId) : undefined,
    relatedStudentId: log.relatedStudentId ? String(log.relatedStudentId) : undefined,
    createdAt: String(log.createdAt || new Date().toISOString()),
  };
}

function normalizeLogType(value: unknown): HealthCheckOperationLogType {
  return LOG_TYPES.includes(value as HealthCheckOperationLogType)
    ? (value as HealthCheckOperationLogType)
    : 'manualNote';
}

function fromRow(row: HealthCheckOperationLogRow): HealthCheckOperationLog {
  return normalizeLog({
    id: row.id,
    sessionId: row.session_id,
    type: row.type,
    message: row.message,
    relatedClassId: row.related_class_id || undefined,
    relatedStudentId: row.related_student_id || undefined,
    createdAt: row.created_at,
  });
}

function toRow(log: HealthCheckOperationLog): HealthCheckOperationLogRow {
  const normalized = normalizeLog(log);

  return {
    id: normalized.id,
    session_id: normalized.sessionId,
    type: normalized.type,
    message: normalized.message,
    related_class_id: normalized.relatedClassId ?? null,
    related_student_id: normalized.relatedStudentId ?? null,
    created_at: normalized.createdAt,
  };
}

function createLogFromInput(
  sessionId: string,
  input: HealthCheckOperationLogInput,
): HealthCheckOperationLog {
  return normalizeLog({
    ...input,
    id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    sessionId,
    createdAt: new Date().toISOString(),
  });
}

export async function listLogs(sessionId: string): Promise<HealthCheckOperationLog[]> {
  const client = getSupabaseClient();
  const { data, error } = await client
    .from(TABLE_NAME)
    .select('*')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: false });

  if (error) {
    throw error;
  }

  return ((data ?? []) as HealthCheckOperationLogRow[]).map(fromRow);
}

export async function listRecentLogs(
  sessionId: string,
  limit: number,
): Promise<HealthCheckOperationLog[]> {
  const client = getSupabaseClient();
  const { data, error } = await client
    .from(TABLE_NAME)
    .select('*')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: false })
    .limit(Math.max(0, limit));

  if (error) {
    throw error;
  }

  return ((data ?? []) as HealthCheckOperationLogRow[]).map(fromRow);
}

export async function createLog(log: HealthCheckOperationLog): Promise<HealthCheckOperationLog> {
  const client = getSupabaseClient();
  const { data, error } = await client
    .from(TABLE_NAME)
    .insert(toRow(log))
    .select('*')
    .single();

  if (error) {
    throw error;
  }

  return fromRow(data as HealthCheckOperationLogRow);
}

export async function deleteLog(id: string): Promise<void> {
  const client = getSupabaseClient();
  const { error } = await client.from(TABLE_NAME).delete().eq('id', id);

  if (error) {
    throw error;
  }
}

export async function clearLogs(sessionId: string): Promise<void> {
  const client = getSupabaseClient();
  const { error } = await client.from(TABLE_NAME).delete().eq('session_id', sessionId);

  if (error) {
    throw error;
  }
}

export const healthCheckOperationLogRepository = {
  listBySession(sessionId: string): Promise<HealthCheckOperationLog[]> {
    return listLogs(sessionId);
  },

  recent(sessionId: string, limit: number): Promise<HealthCheckOperationLog[]> {
    return listRecentLogs(sessionId, limit);
  },

  add(
    sessionId: string,
    input: HealthCheckOperationLogInput,
  ): Promise<HealthCheckOperationLog> {
    return createLog(createLogFromInput(sessionId, input));
  },

  async delete(sessionId: string, logId: string): Promise<HealthCheckOperationLog[]> {
    await deleteLog(logId);
    return listLogs(sessionId);
  },

  async clear(sessionId: string): Promise<HealthCheckOperationLog[]> {
    await clearLogs(sessionId);
    return [];
  },
};
