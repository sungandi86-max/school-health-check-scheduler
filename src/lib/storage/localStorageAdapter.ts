import type { StorageAdapter } from './storageAdapter';

function isLocalStorageAvailable() {
  return typeof localStorage !== 'undefined';
}

export const localStorageAdapter: StorageAdapter = {
  getItem<T>(key: string): T | null {
    if (!isLocalStorageAvailable()) return null;
    const raw = localStorage.getItem(key);
    if (raw === null) return null;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return raw as T;
    }
  },

  setItem<T>(key: string, value: T): void {
    if (!isLocalStorageAvailable()) return;
    localStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value));
  },

  removeItem(key: string): void {
    if (!isLocalStorageAvailable()) return;
    localStorage.removeItem(key);
  },

  clear(): void {
    if (!isLocalStorageAvailable()) return;
    localStorage.clear();
  },
};
