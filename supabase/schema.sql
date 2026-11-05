-- ===========================================================================
-- Taskly — database schema for Supabase
--
-- HOW TO RUN THIS
--   1. Open your project at https://supabase.com
--   2. Left sidebar → SQL Editor → New query
--   3. Paste this whole file and press Run
--
-- It is safe to run more than once: every statement uses IF NOT EXISTS or
-- drops the old version first.
--
-- THE IMPORTANT PART IS ROW LEVEL SECURITY (RLS).
-- The anon key in supabaseConfig.js is public and ships inside the browser.
-- It is the policies below -- not the key -- that keep data private: every
-- policy checks auth.uid() = user_id, so the database will only ever return
-- or modify rows belonging to the user making the request. Without RLS
-- enabled, a public anon key would expose every row to everyone.
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- TABLES
-- ---------------------------------------------------------------------------

-- People a task can be assigned to.
create table if not exists public.members (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  name        text not null check (char_length(trim(name)) between 1 and 80),
  color       text not null default '#2563eb',
  created_at  timestamptz not null default now()
);

-- Task categories. The id is a slug ('work'), so it is text, not uuid.
-- It is unique per user, which is why the primary key is the pair.
create table if not exists public.categories (
  id          text not null check (char_length(id) between 1 and 60),
  user_id     uuid not null references auth.users (id) on delete cascade,
  label       text not null check (char_length(trim(label)) between 1 and 80),
  color       text not null default '#2563eb',
  created_at  timestamptz not null default now(),
  primary key (user_id, id)
);

create table if not exists public.tasks (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  title       text not null check (char_length(trim(title)) between 1 and 300),
  description text not null default '',
  status      text not null default 'todo'   check (status   in ('todo', 'in-progress', 'done')),
  priority    text not null default 'medium' check (priority in ('low', 'medium', 'high')),
  category    text not null default 'work',
  due_date    date,
  -- If a member is deleted their tasks are kept and simply become unassigned.
  assignee_id uuid references public.members (id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- INDEXES  (make the common queries fast once you have many rows)
-- ---------------------------------------------------------------------------
create index if not exists tasks_user_created_idx on public.tasks (user_id, created_at desc);
create index if not exists tasks_user_status_idx  on public.tasks (user_id, status);
create index if not exists tasks_assignee_idx     on public.tasks (assignee_id);
create index if not exists members_user_idx       on public.members (user_id);

-- ---------------------------------------------------------------------------
-- KEEP updated_at HONEST
-- Done in the database so it is correct no matter what wrote the row.
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists tasks_set_updated_at on public.tasks;
create trigger tasks_set_updated_at
  before update on public.tasks
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- ROW LEVEL SECURITY
-- ---------------------------------------------------------------------------
alter table public.tasks      enable row level security;
alter table public.members    enable row level security;
alter table public.categories enable row level security;

-- tasks
drop policy if exists "own tasks: select" on public.tasks;
create policy "own tasks: select" on public.tasks
  for select using (auth.uid() = user_id);

drop policy if exists "own tasks: insert" on public.tasks;
create policy "own tasks: insert" on public.tasks
  for insert with check (auth.uid() = user_id);

drop policy if exists "own tasks: update" on public.tasks;
create policy "own tasks: update" on public.tasks
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own tasks: delete" on public.tasks;
create policy "own tasks: delete" on public.tasks
  for delete using (auth.uid() = user_id);

-- members
drop policy if exists "own members: select" on public.members;
create policy "own members: select" on public.members
  for select using (auth.uid() = user_id);

drop policy if exists "own members: insert" on public.members;
create policy "own members: insert" on public.members
  for insert with check (auth.uid() = user_id);

drop policy if exists "own members: update" on public.members;
create policy "own members: update" on public.members
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own members: delete" on public.members;
create policy "own members: delete" on public.members
  for delete using (auth.uid() = user_id);

-- categories
drop policy if exists "own categories: select" on public.categories;
create policy "own categories: select" on public.categories
  for select using (auth.uid() = user_id);

drop policy if exists "own categories: insert" on public.categories;
create policy "own categories: insert" on public.categories
  for insert with check (auth.uid() = user_id);

drop policy if exists "own categories: update" on public.categories;
create policy "own categories: update" on public.categories
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own categories: delete" on public.categories;
create policy "own categories: delete" on public.categories
  for delete using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- CHECK IT WORKED
-- Every row below should say rowsecurity = true.
-- ---------------------------------------------------------------------------
-- select tablename, rowsecurity from pg_tables
-- where schemaname = 'public' and tablename in ('tasks', 'members', 'categories');
