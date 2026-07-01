import type { HealthCheckOperationState } from '../../types/healthCheck';
import { supabase } from '../supabase/client';

const TABLE_NAME = 'health_check_operation_states';

interface HealthCheckOperationStateRow {
  session_id: string;
  current_class_id: string;
  next_class_id: string;
  completed_class_ids: string[];
  missing_class_ids: string[];
  delayed_minutes: number;
  notice_message: string;
  operation_memo: string;
  updated_at: string;
}

type HealthCheckOperationStatePatch = Partial<Omit<HealthCheckOperationState, 'sessionId'>>;

function getSupabaseClient() {
  if (!supabase) {
    throw new Error(
      'Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY before using HealthCheckOperationStateRepository.',
    );
  }

  return supabase;
}

function normalizeState(state: HealthCheckOperationState): HealthCheckOperationState {
  return {
    sessionId: String(state.sessionId || ''),
    currentClassId: String(state.currentClassId || ''),
    nextClassId: String(state.nextClassId || ''),
    completedClassIds: Array.isArray(state.completedClassIds)
      ? state.completedClassIds.map(String).filter(Boolean)
      : [],
    missingClassIds: Array.isArray(state.missingClassIds)
      ? state.missingClassIds.map(String).filter(Boolean)
      : [],
    delayedMinutes: Math.max(0, Number(state.delayedMinutes) || 0),
    noticeMessage: String(state.noticeMessage || ''),
    operationMemo: String(state.operationMemo || ''),
    updatedAt: String(state.updatedAt || new Date().toISOString()),
  };
}

function fromRow(row: HealthCheckOperationStateRow): HealthCheckOperationState {
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

function toRow(
  sessionId: string,
  state: HealthCheckOperationState,
): HealthCheckOperationStateRow {
  const normalized = normalizeState({ ...state, sessionId });

  return {
    session_id: normalized.sessionId,
    current_class_id: normalized.currentClassId,
    next_class_id: normalized.nextClassId,
    completed_class_ids: normalized.completedClassIds,
    missing_class_ids: normalized.missingClassIds,
    delayed_minutes: normalized.delayedMinutes,
    notice_message: normalized.noticeMessage,
    operation_memo: normalized.operationMemo,
    updated_at: normalized.updatedAt,
  };
}

function toPatchRow(
  patch: HealthCheckOperationStatePatch,
): Partial<HealthCheckOperationStateRow> {
  const row: Partial<HealthCheckOperationStateRow> = {
    updated_at: patch.updatedAt ?? new Date().toISOString(),
  };

  if (patch.currentClassId !== undefined) row.current_class_id = patch.currentClassId;
  if (patch.nextClassId !== undefined) row.next_class_id = patch.nextClassId;
  if (patch.completedClassIds !== undefined) {
    row.completed_class_ids = patch.completedClassIds.map(String).filter(Boolean);
  }
  if (patch.missingClassIds !== undefined) {
    row.missing_class_ids = patch.missingClassIds.map(String).filter(Boolean);
  }
  if (patch.delayedMinutes !== undefined) {
    row.delayed_minutes = Math.max(0, Number(patch.delayedMinutes) || 0);
  }
  if (patch.noticeMessage !== undefined) row.notice_message = patch.noticeMessage;
  if (patch.operationMemo !== undefined) row.operation_memo = patch.operationMemo;

  return row;
}

export async function getOperationState(
  sessionId: string,
): Promise<HealthCheckOperationState | null> {
  const client = getSupabaseClient();
  const { data, error } = await client
    .from(TABLE_NAME)
    .select('*')
    .eq('session_id', sessionId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data ? fromRow(data as HealthCheckOperationStateRow) : null;
}

export async function upsertOperationState(
  sessionId: string,
  state: HealthCheckOperationState,
): Promise<HealthCheckOperationState> {
  const client = getSupabaseClient();
  const row = toRow(sessionId, {
    ...state,
    sessionId,
    updatedAt: state.updatedAt || new Date().toISOString(),
  });

  const { data, error } = await client
    .from(TABLE_NAME)
    .upsert(row, { onConflict: 'session_id' })
    .select('*')
    .single();

  if (error) {
    throw error;
  }

  return fromRow(data as HealthCheckOperationStateRow);
}

export async function updateOperationState(
  sessionId: string,
  patch: HealthCheckOperationStatePatch,
): Promise<HealthCheckOperationState> {
  const client = getSupabaseClient();
  const { data, error } = await client
    .from(TABLE_NAME)
    .update(toPatchRow(patch))
    .eq('session_id', sessionId)
    .select('*')
    .single();

  if (error) {
    throw error;
  }

  return fromRow(data as HealthCheckOperationStateRow);
}

export async function deleteOperationState(sessionId: string): Promise<void> {
  const client = getSupabaseClient();
  const { error } = await client.from(TABLE_NAME).delete().eq('session_id', sessionId);

  if (error) {
    throw error;
  }
}

export const healthCheckOperationStateRepository = {
  async get(sessionId: string): Promise<HealthCheckOperationState> {
    const state = await getOperationState(sessionId);
    return state ?? createEmptyOperationState(sessionId);
  },

  save(state: HealthCheckOperationState): Promise<HealthCheckOperationState> {
    return upsertOperationState(state.sessionId, state);
  },

  async update(
    sessionId: string,
    patch: HealthCheckOperationStatePatch,
  ): Promise<HealthCheckOperationState> {
    try {
      return await updateOperationState(sessionId, patch);
    } catch (error) {
      console.warn('[HealthCheckOperationStateRepository] Operation state update failed. Creating default state.', error);
      return upsertOperationState(sessionId, {
        ...createEmptyOperationState(sessionId),
        ...patch,
        sessionId,
        updatedAt: patch.updatedAt ?? new Date().toISOString(),
      });
    }
  },
};

function createEmptyOperationState(sessionId: string): HealthCheckOperationState {
  return normalizeState({
    sessionId,
    currentClassId: '',
    nextClassId: '',
    completedClassIds: [],
    missingClassIds: [],
    delayedMinutes: 0,
    noticeMessage: '',
    operationMemo: '',
    updatedAt: new Date().toISOString(),
  });
}
