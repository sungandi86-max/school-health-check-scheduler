import { getStorageMode } from '../storage/storageProvider';
import { isSupabaseConfigured, supabase } from '../supabase/client';

export type RealtimeTableName = 'health_check_operation_states' | 'health_check_students' | 'health_check_operation_logs';

export function canUseSupabaseRealtime() {
  return getStorageMode() === 'supabase' && isSupabaseConfigured() && Boolean(supabase);
}

export function getSupabaseRealtimeClient() {
  return canUseSupabaseRealtime() ? supabase : null;
}
