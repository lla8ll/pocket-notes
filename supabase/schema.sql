-- Pocket Notes — Supabase schema.
-- Run this once in the Supabase SQL editor (Dashboard > SQL Editor > New query).

-- One row per note, owned by an authenticated user.
create table if not exists public.notes (
  id uuid primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  content text not null default '',
  created_at timestamptz not null,
  updated_at timestamptz not null,
  deleted_at timestamptz,
  is_pinned boolean not null default false,
  -- Server-side clock for last-write-wins conflict resolution across devices.
  synced_at timestamptz not null default now()
);

-- Fast per-user listing and sync-since queries.
create index if not exists notes_user_synced_idx on public.notes (user_id, synced_at desc);

-- Keep synced_at authoritative on every write.
create or replace function public.touch_synced_at()
returns trigger language plpgsql as $$
begin
  new.synced_at := now();
  return new;
end;
$$;

drop trigger if exists notes_touch_synced_at on public.notes;
create trigger notes_touch_synced_at
  before insert or update on public.notes
  for each row execute function public.touch_synced_at();

-- Row Level Security: a user sees and writes only their own notes.
alter table public.notes enable row level security;

drop policy if exists "notes are private to owner (select)" on public.notes;
create policy "notes are private to owner (select)"
  on public.notes for select using (auth.uid() = user_id);

drop policy if exists "notes are private to owner (insert)" on public.notes;
create policy "notes are private to owner (insert)"
  on public.notes for insert with check (auth.uid() = user_id);

drop policy if exists "notes are private to owner (update)" on public.notes;
create policy "notes are private to owner (update)"
  on public.notes for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "notes are private to owner (delete)" on public.notes;
create policy "notes are private to owner (delete)"
  on public.notes for delete using (auth.uid() = user_id);
