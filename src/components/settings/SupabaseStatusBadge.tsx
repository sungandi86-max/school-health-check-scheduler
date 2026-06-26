import { isSupabaseConfigured } from '../../lib/supabase/client';

export function SupabaseStatusBadge() {
  const configured = isSupabaseConfigured();

  return (
    <span className={configured ? 'status-pill ready' : 'status-pill muted'}>
      {configured ? 'Supabase 설정됨' : 'Supabase 미설정'}
    </span>
  );
}
