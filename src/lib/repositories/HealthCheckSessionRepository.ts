import type { HealthCheckSession, HealthCheckSessionStatus, HealthCheckType } from '../../types/healthCheck';
import { getHealthCheckLabel, normalizeHealthCheckType } from '../healthCheck';
import { localStorageAdapter } from '../storage/localStorageAdapter';
import { ACTIVE_HEALTH_CHECK_SESSION_ID_KEY, HEALTH_CHECK_SESSIONS_KEY } from '../storage/storageKeys';
import { getStorageMode } from '../storage/storageProvider';
import { isSupabaseConfigured, supabase } from '../supabase/client';

type CreateHealthCheckSessionInput = {
  title: string;
  checkType: HealthCheckType;
  date: string;
  targetGrades: string[];
  location: string;
  status: HealthCheckSessionStatus;
};

type UpdateHealthCheckSessionInput = Partial<Omit<HealthCheckSession, 'id' | 'createdAt'>>;

type HealthCheckSessionRow = {
  id: string;
  title: string;
  check_type: HealthCheckType;
  date: string;
  target_grades: string[];
  location: string;
  status: HealthCheckSessionStatus;
  created_at: string;
  updated_at: string;
};

const TABLE_NAME = 'health_check_sessions';
const SESSION_STATUSES: HealthCheckSessionStatus[] = ['draft', 'scheduled', 'inProgress', 'completed', 'archived'];

export class HealthCheckSessionRepository {
  async list(): Promise<HealthCheckSession[]> {
    return this.withSupabase(
      'list sessions',
      async () => {
        const client = requireSupabaseClient();
        const { data, error } = await client
          .from(TABLE_NAME)
          .select('*')
          .order('date', { ascending: false })
          .order('title', { ascending: true });
        if (error) throw error;
        return (data ?? []).map(fromRow).sort(compareSessions);
      },
      () => this.listLocal(),
    );
  }

  async create(input: CreateHealthCheckSessionInput): Promise<HealthCheckSession> {
    return this.withSupabase(
      'create session',
      async () => {
        const client = requireSupabaseClient();
        const session = buildSession(input);
        const { data, error } = await client
          .from(TABLE_NAME)
          .upsert(toRow(session), { onConflict: 'id' })
          .select('*')
          .single();
        if (error) throw error;
        const created = fromRow(data);
        this.setActiveSessionIdLocal(created.id);
        return created;
      },
      () => this.createLocal(input),
    );
  }

  async update(sessionId: string, patch: UpdateHealthCheckSessionInput): Promise<HealthCheckSession | undefined> {
    return this.withSupabase(
      'update session',
      async () => {
        const client = requireSupabaseClient();
        const { data, error } = await client
          .from(TABLE_NAME)
          .update(toUpdateRow(patch))
          .eq('id', sessionId)
          .select('*')
          .maybeSingle();
        if (error) throw error;
        return data ? fromRow(data) : undefined;
      },
      () => this.updateLocal(sessionId, patch),
    );
  }

  async delete(sessionId: string): Promise<HealthCheckSession[]> {
    return this.withSupabase(
      'delete session',
      async () => {
        const client = requireSupabaseClient();
        const { error } = await client.from(TABLE_NAME).delete().eq('id', sessionId);
        if (error) throw error;
        const next = await this.list();
        if (this.getActiveSessionIdLocal() === sessionId) this.setActiveSessionIdLocal(next[0]?.id ?? '');
        return next;
      },
      () => this.deleteLocal(sessionId),
    );
  }

  async getActiveSessionId(): Promise<string> {
    return this.getActiveSessionIdLocal();
  }

  async setActiveSessionId(sessionId: string) {
    this.setActiveSessionIdLocal(sessionId);
  }

  async getActiveSession(): Promise<HealthCheckSession | undefined> {
    const sessions = await this.list();
    const activeId = await this.getActiveSessionId();
    return sessions.find((session) => session.id === activeId) ?? sessions[0];
  }

  async createFromDefaults({
    checkType,
    date,
    targetGrades,
    location,
  }: {
    checkType: HealthCheckType;
    date: string;
    targetGrades: string[];
    location: string;
  }) {
    const normalizedGrades = normalizeGrades(targetGrades);
    return this.create({
      title: `${normalizedGrades.join('·')}학년 ${getHealthCheckLabel(checkType)}`,
      checkType,
      date,
      targetGrades: normalizedGrades,
      location,
      status: 'draft',
    });
  }

  private async withSupabase<T>(label: string, remote: () => Promise<T>, fallback: () => T | Promise<T>) {
    if (!shouldUseSupabaseSessions()) return fallback();
    try {
      return await remote();
    } catch (error) {
      console.warn(`[HealthCheckSessionRepository] Supabase ${label} failed. Falling back to localStorage.`, error);
      return fallback();
    }
  }

  private listLocal() {
    try {
      const parsed = localStorageAdapter.getItem<Partial<HealthCheckSession>[]>(HEALTH_CHECK_SESSIONS_KEY) ?? [];
      return Array.isArray(parsed) ? parsed.map(normalizeSession).sort(compareSessions) : [];
    } catch (error) {
      console.warn('[HealthCheckSessionRepository] Failed to read local sessions.', error);
      return [];
    }
  }

  private saveLocal(sessions: HealthCheckSession[]) {
    try {
      localStorageAdapter.setItem(HEALTH_CHECK_SESSIONS_KEY, sessions.map(normalizeSession).sort(compareSessions));
    } catch (error) {
      console.warn('[HealthCheckSessionRepository] Failed to save local sessions.', error);
    }
  }

  private createLocal(input: CreateHealthCheckSessionInput) {
    const session = buildSession(input);
    const sessions = [...this.listLocal().filter((item) => item.id !== session.id), session];
    this.saveLocal(sessions);
    this.setActiveSessionIdLocal(session.id);
    return session;
  }

  private updateLocal(sessionId: string, patch: UpdateHealthCheckSessionInput) {
    const sessions = this.listLocal();
    const next = sessions.map((session) =>
      session.id === sessionId
        ? normalizeSession({
            ...session,
            ...patch,
            checkType: patch.checkType ? normalizeHealthCheckType(patch.checkType) : session.checkType,
            targetGrades: patch.targetGrades ? normalizeGrades(patch.targetGrades) : session.targetGrades,
            updatedAt: new Date().toISOString(),
          })
        : session,
    );
    this.saveLocal(next);
    return next.find((session) => session.id === sessionId);
  }

  private deleteLocal(sessionId: string) {
    const next = this.listLocal().filter((session) => session.id !== sessionId);
    this.saveLocal(next);
    if (this.getActiveSessionIdLocal() === sessionId) this.setActiveSessionIdLocal(next[0]?.id ?? '');
    return next;
  }

  private getActiveSessionIdLocal() {
    return localStorageAdapter.getItem<string>(ACTIVE_HEALTH_CHECK_SESSION_ID_KEY) || '';
  }

  private setActiveSessionIdLocal(sessionId: string) {
    if (!sessionId) localStorageAdapter.removeItem(ACTIVE_HEALTH_CHECK_SESSION_ID_KEY);
    else localStorageAdapter.setItem(ACTIVE_HEALTH_CHECK_SESSION_ID_KEY, sessionId);
  }
}

export const healthCheckSessionRepository = new HealthCheckSessionRepository();

function shouldUseSupabaseSessions() {
  return getStorageMode() === 'supabase' && isSupabaseConfigured() && Boolean(supabase);
}

function requireSupabaseClient() {
  if (!supabase) throw new Error('Supabase client is not configured.');
  return supabase;
}

function buildSession(input: CreateHealthCheckSessionInput): HealthCheckSession {
  const now = new Date().toISOString();
  const checkType = normalizeHealthCheckType(input.checkType);
  const targetGrades = normalizeGrades(input.targetGrades);
  const date = String(input.date || new Date().toISOString().slice(0, 10));
  const title = input.title.trim() || `${targetGrades.join('·')}학년 ${getHealthCheckLabel(checkType)}`;
  return {
    id: createSessionId(date, checkType, title),
    title,
    checkType,
    date,
    targetGrades,
    location: input.location.trim(),
    status: normalizeSessionStatus(input.status),
    createdAt: now,
    updatedAt: now,
  };
}

function normalizeSession(session: Partial<HealthCheckSession>): HealthCheckSession {
  const now = new Date().toISOString();
  const checkType = normalizeHealthCheckType(session.checkType);
  const targetGrades = normalizeGrades(session.targetGrades ?? []);
  const date = String(session.date || new Date().toISOString().slice(0, 10));
  const title = String(session.title || `${targetGrades.join('·')}학년 ${getHealthCheckLabel(checkType)}`).trim();

  return {
    id: String(session.id || createSessionId(date, checkType, title)),
    title,
    checkType,
    date,
    targetGrades,
    location: String(session.location || ''),
    status: normalizeSessionStatus(session.status),
    createdAt: String(session.createdAt || now),
    updatedAt: String(session.updatedAt || session.createdAt || now),
  };
}

function normalizeSessionStatus(status: unknown): HealthCheckSessionStatus {
  return SESSION_STATUSES.includes(status as HealthCheckSessionStatus) ? (status as HealthCheckSessionStatus) : 'draft';
}

function normalizeGrades(grades: string[]) {
  return [...new Set(grades.flatMap((grade) => String(grade).split(/,|·|\s/)).map((grade) => grade.trim()).filter(Boolean))].sort((a, b) =>
    a.localeCompare(b, 'ko', { numeric: true }),
  );
}

function createSessionId(date: string, checkType: HealthCheckType, title: string) {
  const datePart = String(date || new Date().toISOString().slice(0, 10)).replace(/-/g, '');
  const titlePart = String(title || getHealthCheckLabel(checkType)).replace(/[^0-9A-Za-z가-힣]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
  return `session_${datePart}_${checkType}_${titlePart || Date.now()}`;
}

function compareSessions(a: HealthCheckSession, b: HealthCheckSession) {
  return b.date.localeCompare(a.date) || a.title.localeCompare(b.title, 'ko', { numeric: true });
}

function fromRow(row: HealthCheckSessionRow): HealthCheckSession {
  return normalizeSession({
    id: row.id,
    title: row.title,
    checkType: row.check_type,
    date: row.date,
    targetGrades: row.target_grades ?? [],
    location: row.location,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  });
}

function toRow(session: HealthCheckSession): HealthCheckSessionRow {
  return {
    id: session.id,
    title: session.title,
    check_type: session.checkType,
    date: session.date,
    target_grades: session.targetGrades,
    location: session.location,
    status: session.status,
    created_at: session.createdAt,
    updated_at: session.updatedAt,
  };
}

function toUpdateRow(patch: UpdateHealthCheckSessionInput) {
  return {
    ...(patch.title !== undefined ? { title: patch.title } : {}),
    ...(patch.checkType !== undefined ? { check_type: normalizeHealthCheckType(patch.checkType) } : {}),
    ...(patch.date !== undefined ? { date: patch.date } : {}),
    ...(patch.targetGrades !== undefined ? { target_grades: normalizeGrades(patch.targetGrades) } : {}),
    ...(patch.location !== undefined ? { location: patch.location } : {}),
    ...(patch.status !== undefined ? { status: normalizeSessionStatus(patch.status) } : {}),
    updated_at: new Date().toISOString(),
  };
}
