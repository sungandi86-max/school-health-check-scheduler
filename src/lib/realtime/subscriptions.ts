import type { RealtimeChannel } from '@supabase/supabase-js';
import { getSupabaseRealtimeClient, type RealtimeTableName } from './realtime';

export type HealthCheckRealtimeChange = {
  table: RealtimeTableName;
  eventType: string;
};

export type HealthCheckRealtimeSubscription = {
  unsubscribe: () => void;
};

const REALTIME_TABLES: RealtimeTableName[] = [
  'health_check_operation_states',
  'health_check_students',
  'health_check_operation_logs',
];

export function subscribeToHealthCheckRealtime(
  sessionId: string,
  onChange: (change: HealthCheckRealtimeChange) => void,
): HealthCheckRealtimeSubscription {
  const client = getSupabaseRealtimeClient();
  if (!client || !sessionId) return { unsubscribe: () => undefined };

  const channel = client.channel(`health-check-session-${sessionId}`);
  for (const table of REALTIME_TABLES) {
    channel.on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table,
        filter: `session_id=eq.${sessionId}`,
      },
      (payload) => onChange({ table, eventType: payload.eventType }),
    );
  }

  channel.subscribe((status) => {
    if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
      console.warn(`[Realtime] health check subscription ${status} for session ${sessionId}`);
    }
  });

  return {
    unsubscribe: () => removeChannel(channel),
  };
}

function removeChannel(channel: RealtimeChannel) {
  const client = getSupabaseRealtimeClient();
  if (!client) return;
  void client.removeChannel(channel).catch((error) => {
    console.warn('[Realtime] Failed to remove health check channel.', error);
  });
}
