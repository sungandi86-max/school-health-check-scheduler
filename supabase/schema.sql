-- School Health Hub Supabase schema
-- Initial PostgreSQL schema for future realtime synchronization.
-- This file does not enable app-side DB reads/writes by itself.

create table if not exists public.health_check_sessions (
  id text primary key,
  title text not null,
  check_type text not null check (check_type in ('urine', 'tuberculosis', 'general', 'other')),
  date date not null,
  target_grades text[] not null default '{}',
  location text not null default '',
  status text not null default 'draft' check (status in ('draft', 'scheduled', 'inProgress', 'completed', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.health_check_students (
  id text primary key,
  session_id text not null references public.health_check_sessions(id) on delete cascade,
  check_type text not null check (check_type in ('urine', 'tuberculosis', 'general', 'other')),
  grade text not null default '',
  class_name text not null default '',
  number text not null default '',
  name text not null default '',
  status text not null default 'pending' check (status in ('pending', 'completed', 'absent', 'earlyLeave', 'late', 'deferred')),
  memo text not null default '',
  updated_at timestamptz not null default now()
);

create table if not exists public.health_check_operation_states (
  session_id text primary key references public.health_check_sessions(id) on delete cascade,
  current_class_id text not null default '',
  next_class_id text not null default '',
  completed_class_ids text[] not null default '{}',
  missing_class_ids text[] not null default '{}',
  delayed_minutes integer not null default 0 check (delayed_minutes >= 0),
  notice_message text not null default '',
  operation_memo text not null default '',
  updated_at timestamptz not null default now()
);

create table if not exists public.health_check_operation_logs (
  id text primary key,
  session_id text not null references public.health_check_sessions(id) on delete cascade,
  type text not null check (
    type in (
      'sessionStarted',
      'classStarted',
      'classCompleted',
      'classMissing',
      'classMissingCleared',
      'studentStatusChanged',
      'delayUpdated',
      'noticeGenerated',
      'memoUpdated',
      'manualNote'
    )
  ),
  message text not null,
  related_class_id text,
  related_student_id text references public.health_check_students(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.health_check_report_notes (
  session_id text primary key references public.health_check_sessions(id) on delete cascade,
  notes text not null default '',
  updated_at timestamptz not null default now()
);

create index if not exists idx_health_check_sessions_date
  on public.health_check_sessions(date desc);

create index if not exists idx_health_check_students_session_class
  on public.health_check_students(session_id, class_name);

create index if not exists idx_health_check_students_session_status
  on public.health_check_students(session_id, status);

create index if not exists idx_health_check_operation_logs_session_created
  on public.health_check_operation_logs(session_id, created_at desc);

-- Keep updated_at current on mutable tables.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_health_check_sessions_updated_at on public.health_check_sessions;
create trigger set_health_check_sessions_updated_at
before update on public.health_check_sessions
for each row execute function public.set_updated_at();

drop trigger if exists set_health_check_students_updated_at on public.health_check_students;
create trigger set_health_check_students_updated_at
before update on public.health_check_students
for each row execute function public.set_updated_at();

drop trigger if exists set_health_check_operation_states_updated_at on public.health_check_operation_states;
create trigger set_health_check_operation_states_updated_at
before update on public.health_check_operation_states
for each row execute function public.set_updated_at();

drop trigger if exists set_health_check_report_notes_updated_at on public.health_check_report_notes;
create trigger set_health_check_report_notes_updated_at
before update on public.health_check_report_notes
for each row execute function public.set_updated_at();

-- Realtime planning:
-- Enable these tables in the Supabase Realtime publication when ready:
-- public.health_check_students
-- public.health_check_operation_states
-- public.health_check_operation_logs
-- Optional:
-- public.health_check_sessions
-- public.health_check_report_notes

-- RLS planning:
-- alter table public.health_check_sessions enable row level security;
-- alter table public.health_check_students enable row level security;
-- alter table public.health_check_operation_states enable row level security;
-- alter table public.health_check_operation_logs enable row level security;
-- alter table public.health_check_report_notes enable row level security;
-- Define school/role-based policies before exposing production data.
