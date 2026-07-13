-- Chạy file này trong Supabase SQL Editor hoặc qua Supabase CLI.
create table if not exists public.game_saves (
  user_id uuid primary key references auth.users(id) on delete cascade,
  state jsonb not null,
  save_version integer not null default 1,
  last_saved_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.game_saves enable row level security;

revoke all on table public.game_saves from anon;
grant select, insert, update, delete on table public.game_saves to authenticated;

drop policy if exists "Players can read their own game" on public.game_saves;
create policy "Players can read their own game"
on public.game_saves for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Players can create their own game" on public.game_saves;
create policy "Players can create their own game"
on public.game_saves for insert
to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "Players can update their own game" on public.game_saves;
create policy "Players can update their own game"
on public.game_saves for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "Players can delete their own game" on public.game_saves;
create policy "Players can delete their own game"
on public.game_saves for delete
to authenticated
using ((select auth.uid()) = user_id);

create or replace function public.set_game_save_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  new.last_saved_at = now();
  return new;
end;
$$;

drop trigger if exists game_saves_set_updated_at on public.game_saves;
create trigger game_saves_set_updated_at
before update on public.game_saves
for each row execute function public.set_game_save_updated_at();
