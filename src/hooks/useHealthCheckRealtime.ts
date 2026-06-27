import { useEffect, useRef } from 'react';
import { getStorageMode } from '../lib/storage/storageProvider';
import { getOperationLogStorageKey, getOperationStorageKey, getSessionRosterStorageKey } from '../lib/storage/storageKeys';
import { canUseSupabaseRealtime } from '../lib/realtime/realtime';
import { subscribeToHealthCheckRealtime } from '../lib/realtime/subscriptions';

export function useHealthCheckRealtime(sessionId: string | undefined, onChange: () => void) {
  const onChangeRef = useRef(onChange);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    if (!sessionId) return undefined;

    if (canUseSupabaseRealtime()) {
      const subscription = subscribeToHealthCheckRealtime(sessionId, () => onChangeRef.current());
      return () => subscription.unsubscribe();
    }

    if (getStorageMode() !== 'local') return undefined;

    const watchedKeys = new Set([
      getOperationStorageKey(sessionId),
      getSessionRosterStorageKey(sessionId),
      getOperationLogStorageKey(sessionId),
    ]);
    const onStorage = (event: StorageEvent) => {
      if (!event.key || watchedKeys.has(event.key)) onChangeRef.current();
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [sessionId]);
}
