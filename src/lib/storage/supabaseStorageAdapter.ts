import { supabase } from '../supabase/client';
import type { StorageAdapter } from './storageAdapter';

export const supabaseStorageAdapter: StorageAdapter = {
  getItem<T>(_key: string): T | null {
    // TODO: Map storage keys to Supabase tables and replace this synchronous
    // interface with an async adapter before enabling remote persistence.
    return null;
  },

  setItem<T>(_key: string, _value: T): void {
    // TODO: Upsert to Supabase tables by key domain:
    // sessions, students, operation states, operation logs, report notes.
  },

  removeItem(_key: string): void {
    // TODO: Delete from the mapped Supabase table once remote persistence is enabled.
  },

  clear(): void {
    // TODO: Avoid broad remote deletes. Implement scoped cleanup per session/user.
  },
};

export function isSupabaseStorageReady() {
  return Boolean(supabase);
}
