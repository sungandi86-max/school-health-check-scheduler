import { isSupabaseConfigured } from '../supabase/client';
import { localStorageAdapter } from './localStorageAdapter';
import { supabaseStorageAdapter } from './supabaseStorageAdapter';
import type { StorageAdapter, StorageMode } from './storageAdapter';
import { STORAGE_MODE_KEY } from './storageKeys';

const DEFAULT_STORAGE_MODE: StorageMode = 'local';
const ENABLE_SUPABASE_STORAGE_ADAPTER = false;

export function getStorageMode(): StorageMode {
  const stored = localStorageAdapter.getItem<StorageMode>(STORAGE_MODE_KEY);
  return isStorageMode(stored) ? stored : DEFAULT_STORAGE_MODE;
}

export function setStorageMode(mode: StorageMode) {
  localStorageAdapter.setItem(STORAGE_MODE_KEY, mode);
}

export function isRemoteStorageAvailable() {
  return isSupabaseConfigured();
}

export function getStorageAdapter(): StorageAdapter {
  const mode = getStorageMode();
  if (mode === 'supabase' && isRemoteStorageAvailable() && ENABLE_SUPABASE_STORAGE_ADAPTER) return supabaseStorageAdapter;
  return localStorageAdapter;
}

export const storageAdapter: StorageAdapter = {
  getItem<T>(key: string): T | null {
    return getStorageAdapter().getItem<T>(key);
  },

  setItem<T>(key: string, value: T): void {
    getStorageAdapter().setItem(key, value);
  },

  removeItem(key: string): void {
    getStorageAdapter().removeItem(key);
  },

  clear(): void {
    getStorageAdapter().clear();
  },
};

function isStorageMode(value: unknown): value is StorageMode {
  return value === 'local' || value === 'supabase';
}
