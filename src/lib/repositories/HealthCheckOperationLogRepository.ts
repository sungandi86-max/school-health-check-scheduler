import type { HealthCheckOperationLog, HealthCheckOperationLogType } from '../../types/healthCheck';
import { addOperationLog, clearOperationLogs, getOperationLogs, saveOperationLogs, type HealthCheckOperationLogInput } from '../logs';
import { getStorageMode } from '../storage/storageProvider';
import { isSupabaseConfigured, supabase } from '../supabase/client';

type OperationLogRow = {
  id: string;
  session_id: string;
  type: HealthCheckOperationLogType;
  message: string;
  related_class_id: string | null;
  related_student_id: string | null;
  created_at: string;
};

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

export class HealthCheckOperationLogRepository {
  async listBySession(sessionId: string): Promise<HealthCheckOperationLog[]> {
    return this.withSupabase(
      'list logs',
      async () => {
        const client = requireSupabaseClient();
        const { data, error } = await client.from(TABLE_NAME).select('*').eq('session_id', sessionId).order('created_at', { ascending: false });
        if (error) throw error;
        const logs = ((data ?? []) as OperationLogRow[]).map(fromRow).sort(compareLogsDesc);
        this.saveLocal(sessionId, logs);
        return logs;
      },
      () => this.listLocal(sessionId),
    );
  }

  async add(sessionId: string, input: HealthCheckOperationLogInput): Promise<HealthCheckOperationLog> {
    const log = normalizeLog(sessionId, {
      ...input,
      id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      sessionId,
      createdAt: new Date().toISOString(),
    });
    return this.withSupabase(
      'add log',
      async () => {
        const client = requireSupabaseClient();
        const { data, error } = await client.from(TABLE_NAME).insert(toRow(log)).select('*').single();
        if (error) throw error;
        const saved = fromRow(data as OperationLogRow);
        const next = [saved, ...this.listLocal(sessionId).filter((item) => item.id !== saved.id)].sort(compareLogsDesc).slice(0, 500);
        this.saveLocal(sessionId, next);
        return saved;
      },
      () => addOperationLog(sessionId, input),
    );
  }

  async delete(sessionId: string, logId: string): Promise<HealthCheckOperationLog[]> {
    return this.withSupabase(
      'delete log',
      async () => {
        const client = requireSupabaseClient();
        const { error } = await client.from(TABLE_NAME).delete().eq('session_id', sessionId).eq('id', logId);
        if (error) throw error;
        const next = this.listLocal(sessionId).filter((log) => log.id !== logId);
        this.saveLocal(sessionId, next);
        return next;
      },
      () => this.deleteLocal(sessionId, logId),
    );
  }

  async clear(sessionId: string): Promise<HealthCheckOperationLog[]> {
    return this.withSupabase(
      'clear logs',
      async () => {
        const client = requireSupabaseClient();
        const { error } = await client.from(TABLE_NAME).delete().eq('session_id', sessionId);
        if (error) throw error;
        clearOperationLogs(sessionId);
        return [];
      },
      () => {
        clearOperationLogs(sessionId);
        return [];
      },
    );
  }

  async recent(sessionId: string, limit: number): Promise<HealthCheckOperationLog[]> {
    const logs = await this.listBySession(sessionId);
    return logs.slice(0, Math.max(0, limit));
  }

  private async withSupabase<T>(label: string, remote: () => Promise<T>, fallback: () => T | Promise<T>) {
    if (!shouldUseSupabaseOperationLogs()) return fallback();
    try {
      return await remote();
    } catch (error) {
      console.warn(`[HealthCheckOperationLogRepository] Supabase ${label} failed. Falling back to localStorage.`, error);
      return fallback();
    }
  }

  private listLocal(sessionId: string) {
    return getOperationLogs(sessionId).sort(compareLogsDesc);
  }

  private saveLocal(sessionId: string, logs: HealthCheckOperationLog[]) {
    saveOperationLogs(sessionId, logs.map((log) => normalizeLog(sessionId, log)).sort(compareLogsDesc).slice(0, 500));
  }

  private deleteLocal(sessionId: string, logId: string) {
    const next = this.listLocal(sessionId).filter((log) => log.id !== logId);
    this.saveLocal(sessionId, next);
    return next;
  }
}

export const healthCheckOperationLogRepository = new HealthCheckOperationLogRepository();

function shouldUseSupabaseOperationLogs() {
  return getStorageMode() === 'supabase' && isSupabaseConfigured() && Boolean(supabase);
}

function requireSupabaseClient() {
  if (!supabase) throw new Error('Supabase client is not configured.');
  return supabase;
}

function normalizeLog(sessionId: string, log: Partial<HealthCheckOperationLog>): HealthCheckOperationLog {
  return {
    id: String(log.id || `log-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`),
    sessionId: String(log.sessionId || sessionId),
    type: normalizeLogType(log.type),
    message: String(log.message || ''),
    relatedClassId: log.relatedClassId ? String(log.relatedClassId) : undefined,
    relatedStudentId: log.relatedStudentId ? String(log.relatedStudentId) : undefined,
    createdAt: String(log.createdAt || new Date().toISOString()),
  };
}

function normalizeLogType(value: unknown): HealthCheckOperationLogType {
  return LOG_TYPES.includes(value as HealthCheckOperationLogType) ? (value as HealthCheckOperationLogType) : 'manualNote';
}

function compareLogsDesc(a: HealthCheckOperationLog, b: HealthCheckOperationLog) {
  return b.createdAt.localeCompare(a.createdAt);
}

function fromRow(row: OperationLogRow): HealthCheckOperationLog {
  return normalizeLog(row.session_id, {
    id: row.id,
    sessionId: row.session_id,
    type: row.type,
    message: row.message,
    relatedClassId: row.related_class_id || undefined,
    relatedStudentId: row.related_student_id || undefined,
    createdAt: row.created_at,
  });
}

function toRow(log: HealthCheckOperationLog): OperationLogRow {
  return {
    id: log.id,
    session_id: log.sessionId,
    type: log.type,
    message: log.message,
    related_class_id: log.relatedClassId ?? null,
    related_student_id: log.relatedStudentId ?? null,
    created_at: log.createdAt,
  };
}
