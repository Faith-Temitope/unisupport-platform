-- Activity tracking for the admin "Activity" tab (visits/actives/hours/downloads).
-- Nothing else in the schema records this -- every other number on that tab (revenue, AI spend,
-- writer leaderboard, school breakdown) already comes from existing tables with no new SQL needed.

create table if not exists public.app_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  kind text not null check (kind in ('session_start', 'heartbeat', 'page_view', 'download')),
  path text,
  created_at timestamptz not null default now()
);

create index if not exists app_events_kind_created_idx on public.app_events (kind, created_at);
create index if not exists app_events_user_created_idx on public.app_events (user_id, created_at);

alter table public.app_events enable row level security;

-- Any signed-in user can log their own events (or an anonymous one with user_id null); nobody can
-- log events on someone else's behalf.
drop policy if exists "app_events_insert" on public.app_events;
create policy "app_events_insert" on public.app_events for insert
  with check (user_id = auth.uid() or user_id is null);

-- Only admins can read the raw event log (the dashboard queries this as the signed-in admin).
drop policy if exists "app_events_admin_select" on public.app_events;
create policy "app_events_admin_select" on public.app_events for select
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));
