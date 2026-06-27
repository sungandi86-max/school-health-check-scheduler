import type { HealthCheckOperationState } from '../../types/healthCheck';
import {
  clearClassMissing,
  getOperationState,
  saveOperationState,
  setClassCompleted,
  setClassMissing,
  setCurrentClass,
  updateDelayedMinutes,
  updateOperationMemo,
} from '../operation';
import { getStorageMode } from '../storage/storageProvider';
import { isSupabaseConfigured, supabase } from '../supabase/client';

type OperationStatePatch = Partial<Omit<HealthCheckOperationState, 'sessionId'>>;

type OperationStateRow = {
  session_id: string;
  current_class_id: string;
  next_class_id: string;
  completed_class_ids: string[];
  missing_class_ids: string[];
  delayed_minutes: number;
  notice_message: string;
  operation_memo: string;
  updated_at: string;
};

const TABLE_NAME = 'health_check_operation_states';

export class HealthCheckOperationStateRepository {
  async get(sessionId: string): Promise<HealthCheckOperationState> {
    return this.withSupabase(
      'get operation state',
      async () => {
        const client = requireSupabaseClient();
        const { data, error } = await client.from(TABLE_NAME).select('*').eq('session_id', sessionId).maybeSingle();
        if (error) throw error;
        const state = data ? fromRow(data as OperationStateRow) : this.getLocal(sessionId);
        this.saveLocal(state);
        return state;
      },
      () => this.getLocal(sessionId),
    );
  }

  async save(state: HealthCheckOperationState): Promise<HealthCheckOperationState> {
    const next = normalizeState(state);
    return this.withSupabase(
      'save operation state',
      async () => {
        const client = requireSupabaseClient();
        const { data, error } = await client.from(TABLE_NAME).upsert(toRow(next), { onConflict: 'session_id' }).select('*').single();
        if (error) throw error;
        const saved = fromRow(data as OperationStateRow);
        this.saveLocal(saved);
        return saved;
      },
      () => {
        this.saveLocal(next);
        return next;
      },
    );
  }

  async update(sessionId: string, patch: OperationStatePatch): Promise<HealthCheckOperationState> {
    const current = await this.get(sessionId);
    return this.save({ ...current, ...patch, sessionId, updatedAt: new Date().toISOString() });
  }

  async setCurrentClass(sessionId: string, classId: string, classIds: string[] = []) {
    return this.save(setCurrentClass(await this.get(sessionId), classId, classIds));
  }

  async setClassCompleted(sessionId: string, classId: string, classIds: string[] = []) {
    return this.save(setClassCompleted(await this.get(sessionId), classId, classIds));
  }

  async setClassMissing(sessionId: string, classId: string) {
    return this.save(setClassMissing(await this.get(sessionId), classId));
  }

  async clearClassMissing(sessionId: string, classId: string) {
    return this.save(clearClassMissing(await this.get(sessionId), classId));
  }

  async updateDelayedMinutes(sessionId: string, delayedMinutes: number) {
    return this.save(updateDelayedMinutes(await this.get(sessionId), delayedMinutes));
  }

  async updateNoticeMessage(sessionId: string, noticeMessage: string) {
    return this.update(sessionId, { noticeMessage });
  }

  async updateOperationMemo(sessionId: string, operationMemo: string) {
    return this.save(updateOperationMemo(await this.get(sessionId), operationMemo));
  }

  private async withSupabase<T>(label: string, remote: () => Promise<T>, fallback: () => T | Promise<T>) {
    if (!shouldUseSupabaseOperationState()) return fallback();
    try {
      return await remote();
    } catch (error) {
      console.warn(`[HealthCheckOperationStateRepository] Supabase ${label} failed. Falling back to localStorage.`, error);
      return fallback();
    }
  }

  private getLocal(sessionId: string) {
    return getOperationState(sessionId);
  }

  private saveLocal(state: HealthCheckOperationState) {
    saveOperationState(state.sessionId, state);
  }
}

export const healthCheckOperationStateRepository = new HealthCheckOperationStateRepository();

function shouldUseSupabaseOperationState() {
  return getStorageMode() === 'supabase' && isSupabaseConfigured() && Boolean(supabase);
}

function requireSupabaseClient() {
  if (!supabase) throw new Error('Supabase client is not configured.');
  return supabase;
}

function normalizeState(state: HealthCheckOperationState): HealthCheckOperationState {
  return {
    sessionId: String(state.sessionId || ''),
    currentClassId: String(state.currentClassId || ''),
    nextClassId: String(state.nextClassId || ''),
    completedClassIds: Array.isArray(state.completedClassIds) ? state.completedClassIds.map(String).filter(Boolean) : [],
    missingClassIds: Array.isArray(state.missingClassIds) ? state.missingClassIds.map(String).filter(Boolean) : [],
    delayedMinutes: Math.max(0, Number(state.delayedMinutes) || 0),
    noticeMessage: String(state.noticeMessage || ''),
    operationMemo: String(state.operationMemo || ''),
    updatedAt: String(state.updatedAt || new Date().toISOString()),
  };
}

function fromRow(row: OperationStateRow): HealthCheckOperationState {
  return normalizeState({
    sessionId: row.session_id,
    currentClassId: row.current_class_id,
    nextClassId: row.next_class_id,
    completedClassIds: row.completed_class_ids ?? [],
    missingClassIds: row.missing_class_ids ?? [],
    delayedMinutes: row.delayed_minutes,
    noticeMessage: row.notice_message,
    operationMemo: row.operation_memo,
    updatedAt: row.updated_at,
  });
}

function toRow(state: HealthCheckOperationState): OperationStateRow {
  return {
    session_id: state.sessionId,
    current_class_id: state.currentClassId,
    next_class_id: state.nextClassId,
    completed_class_ids: state.completedClassIds,
    missing_class_ids: state.missingClassIds,
    delayed_minutes: state.delayedMinutes,
    notice_message: state.noticeMessage,
    operation_memo: state.operationMemo,
    updated_at: state.updatedAt,
  };
}
