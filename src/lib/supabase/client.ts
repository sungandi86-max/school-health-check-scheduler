import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const env = import.meta.env as unknown as {
  VITE_SUPABASE_URL?: string;
  VITE_SUPABASE_ANON_KEY?: string;
};

const supabaseUrl = env.VITE_SUPABASE_URL?.trim() ?? '';
const supabaseAnonKey = env.VITE_SUPABASE_ANON_KEY?.trim() ?? '';

export const supabase: SupabaseClient | null = createSupabaseClient();

export function isSupabaseConfigured() {
  return Boolean(supabaseUrl && supabaseAnonKey);
}

export function getSupabaseConfigStatus() {
  return isSupabaseConfigured()
    ? {
        enabled: true,
        storageMode: 'localStorage',
        message: 'Supabase 환경변수가 설정되어 있습니다. 현재 앱 데이터 저장은 아직 localStorage fallback을 사용합니다.',
      }
    : {
        enabled: false,
        storageMode: 'localStorage',
        message: 'Supabase 환경변수가 미설정되어 localStorage로 동작합니다.',
      };
}

function createSupabaseClient() {
  if (!isSupabaseConfigured()) return null;
  return createClient(supabaseUrl, supabaseAnonKey);
}
