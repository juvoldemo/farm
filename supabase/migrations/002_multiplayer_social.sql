-- Chạy sau 001_game_saves.sql. Migration multiplayer, không dùng service-role ở frontend.
create extension if not exists citext with schema extensions;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username extensions.citext not null unique check (username::text ~ '^[a-zA-Z0-9_]{3,24}$'),
  display_name text not null check (char_length(btrim(display_name)) between 1 and 40),
  player_code text not null unique default upper(substr(replace(gen_random_uuid()::text,'-',''),1,10)),
  avatar_url text,
  level integer not null default 1 check (level >= 1),
  experience integer not null default 0 check (experience >= 0),
  coins bigint not null default 300 check (coins >= 0),
  status text not null default 'offline' check (status in ('online','offline')),
  last_online_at timestamptz not null default now(),
  migrated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- `create table if not exists` không nâng cấp một bảng profiles cũ. Các ALTER sau
-- giúp migration chạy được trên project đã từng có profiles với schema khác.
alter table public.profiles add column if not exists username extensions.citext;
alter table public.profiles add column if not exists display_name text;
alter table public.profiles add column if not exists player_code text;
alter table public.profiles add column if not exists avatar_url text;
alter table public.profiles add column if not exists level integer;
alter table public.profiles add column if not exists experience integer;
alter table public.profiles add column if not exists coins bigint;
alter table public.profiles add column if not exists status text;
alter table public.profiles add column if not exists last_online_at timestamptz;
alter table public.profiles add column if not exists migrated_at timestamptz;
alter table public.profiles add column if not exists created_at timestamptz;
alter table public.profiles add column if not exists updated_at timestamptz;
alter table public.profiles alter column username type extensions.citext using username::text::extensions.citext;
alter table public.profiles alter column player_code set default upper(substr(replace(gen_random_uuid()::text,'-',''),1,10));
alter table public.profiles alter column level set default 1;
alter table public.profiles alter column experience set default 0;
alter table public.profiles alter column coins set default 300;
alter table public.profiles alter column status set default 'offline';
alter table public.profiles alter column last_online_at set default now();
alter table public.profiles alter column created_at set default now();
alter table public.profiles alter column updated_at set default now();

update public.profiles set
 username=case when username is null or username::text !~ '^[a-zA-Z0-9_]{3,24}$' then 'player_'||substr(replace(id::text,'-',''),1,8) else lower(username::text) end,
 display_name=coalesce(nullif(btrim(display_name),''),'Nông dân'),
 player_code=coalesce(nullif(btrim(player_code),''),upper(substr(replace(id::text,'-',''),1,10))),
 level=greatest(1,coalesce(level,1)),experience=greatest(0,coalesce(experience,0)),coins=greatest(0,coalesce(coins,300)),
 status=case when status in('online','offline') then status else 'offline' end,
 last_online_at=coalesce(last_online_at,now()),created_at=coalesce(created_at,now()),updated_at=coalesce(updated_at,now());

with duplicates as (select id,row_number() over(partition by lower(username::text) order by created_at,id) as position from public.profiles)
update public.profiles p set username='player_'||substr(replace(p.id::text,'-',''),1,8) from duplicates d where p.id=d.id and d.position>1;
with duplicates as (select id,row_number() over(partition by player_code order by created_at,id) as position from public.profiles)
update public.profiles p set player_code=upper(substr(replace(p.id::text,'-',''),1,10)) from duplicates d where p.id=d.id and d.position>1;

alter table public.profiles alter column username set not null;
alter table public.profiles alter column display_name set not null;
alter table public.profiles alter column player_code set not null;
alter table public.profiles alter column level set not null;
alter table public.profiles alter column experience set not null;
alter table public.profiles alter column coins set not null;
alter table public.profiles alter column status set not null;
alter table public.profiles alter column last_online_at set not null;
alter table public.profiles alter column created_at set not null;
alter table public.profiles alter column updated_at set not null;
create unique index if not exists profiles_username_unique_v2 on public.profiles(username);
create unique index if not exists profiles_player_code_unique_v2 on public.profiles(player_code);

create table if not exists public.farms (
  id uuid primary key default gen_random_uuid(), user_id uuid not null unique references auth.users(id) on delete cascade,
  farm_name text not null default 'Nông trại của tôi', farm_level integer not null default 1,
  unlocked_plots integer not null default 3, total_harvested bigint not null default 0,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table if not exists public.farm_plots (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  farm_id uuid not null references public.farms(id) on delete cascade, plot_index integer not null check (plot_index between 1 and 24),
  is_unlocked boolean not null default false, unlock_price integer not null default 0,
  crop_id text, crop_stage text, planted_at timestamptz, watered_at timestamptz, harvest_ready_at timestamptz,
  expected_yield integer, status text not null default 'empty' check (status in ('locked','empty','growing','ready')),
  updated_at timestamptz not null default now(), unique(user_id,plot_index), unique(farm_id,plot_index)
);

create table if not exists public.inventories (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  item_id text not null, item_type text not null, quantity integer not null default 0 check (quantity >= 0),
  updated_at timestamptz not null default now(), unique(user_id,item_id)
);

create table if not exists public.player_progress (
  user_id uuid primary key references auth.users(id) on delete cascade, current_level integer not null default 1,
  current_exp integer not null default 0, completed_tutorial boolean not null default false,
  daily_reward_date date, daily_streak integer not null default 0, achievements jsonb not null default '{}'::jsonb,
  game_settings jsonb not null default '{"music":true,"sound":true,"haptics":true,"volume":0.55}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.friendships (
  id uuid primary key default gen_random_uuid(), requester_id uuid not null references auth.users(id) on delete cascade,
  addressee_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','accepted','rejected','blocked')),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  check (requester_id <> addressee_id)
);
create unique index if not exists friendships_unique_pair on public.friendships(least(requester_id,addressee_id),greatest(requester_id,addressee_id));

create table if not exists public.farm_visits (
  id uuid primary key default gen_random_uuid(), visitor_id uuid not null references auth.users(id) on delete cascade,
  farm_owner_id uuid not null references auth.users(id) on delete cascade, visited_at timestamptz not null default now(),
  action_type text not null default 'view', reward_received integer not null default 0, metadata jsonb not null default '{}'::jsonb,
  check(visitor_id <> farm_owner_id)
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  type text not null, title text not null, message text not null, sender_id uuid references auth.users(id) on delete set null,
  is_read boolean not null default false, reference_id uuid, created_at timestamptz not null default now()
);
create index if not exists notifications_user_created on public.notifications(user_id,created_at desc);

-- Backfill an toàn cho tài khoản đã tồn tại trước migration này.
insert into public.profiles(id,username,display_name)
select u.id,'player_'||substr(replace(u.id::text,'-',''),1,8),coalesce(nullif(split_part(u.email,'@',1),''),'Nông dân') from auth.users u
on conflict(id) do nothing;
insert into public.farms(user_id,farm_name) select p.id,'Nông trại của '||p.display_name from public.profiles p on conflict(user_id) do nothing;
insert into public.farm_plots(user_id,farm_id,plot_index,is_unlocked,unlock_price,status)
select f.user_id,f.id,i,i<=3,(array[0,0,0,500,800,1200,1800,2500,3500,5000,7000,10000,14000,19000,25000,32000,40000,50000,65000,80000,100000,130000,170000,220000])[i],case when i<=3 then 'empty' else 'locked' end
from public.farms f cross join generate_series(1,24)i on conflict(user_id,plot_index) do nothing;
insert into public.inventories(user_id,item_id,item_type,quantity) select p.id,v.item_id,v.item_type,v.quantity from public.profiles p cross join(values('seed:cabbage','seed',10),('seed:carrot','seed',5),('fertilizer:small','fertilizer',2))v(item_id,item_type,quantity) on conflict(user_id,item_id) do nothing;
insert into public.player_progress(user_id) select id from public.profiles on conflict(user_id) do nothing;

create or replace function public.are_friends(a uuid,b uuid) returns boolean language sql stable security definer set search_path=public as $$
 select auth.uid() in(a,b) and exists(select 1 from public.friendships where status='accepted' and least(requester_id,addressee_id)=least(a,b) and greatest(requester_id,addressee_id)=greatest(a,b));
$$;

alter table public.profiles enable row level security; alter table public.farms enable row level security;
alter table public.farm_plots enable row level security; alter table public.inventories enable row level security;
alter table public.player_progress enable row level security; alter table public.friendships enable row level security;
alter table public.farm_visits enable row level security; alter table public.notifications enable row level security;

drop policy if exists "profiles public read" on public.profiles;
drop policy if exists "profiles own update" on public.profiles;
drop policy if exists "farms owner or friend read" on public.farms;
drop policy if exists "plots owner or friend read" on public.farm_plots;
drop policy if exists "inventory own read" on public.inventories;
drop policy if exists "progress own read" on public.player_progress;
drop policy if exists "friendships participants read" on public.friendships;
drop policy if exists "visits participants read" on public.farm_visits;
drop policy if exists "notifications own read" on public.notifications;
drop policy if exists "notifications own mark" on public.notifications;

create policy "profiles public read" on public.profiles for select to authenticated using(true);
create policy "profiles own update" on public.profiles for update to authenticated using(auth.uid()=id) with check(auth.uid()=id);
create policy "farms owner or friend read" on public.farms for select to authenticated using(auth.uid()=user_id or public.are_friends(auth.uid(),user_id));
create policy "plots owner or friend read" on public.farm_plots for select to authenticated using(auth.uid()=user_id or public.are_friends(auth.uid(),user_id));
create policy "inventory own read" on public.inventories for select to authenticated using(auth.uid()=user_id);
create policy "progress own read" on public.player_progress for select to authenticated using(auth.uid()=user_id);
create policy "friendships participants read" on public.friendships for select to authenticated using(auth.uid() in (requester_id,addressee_id));
create policy "visits participants read" on public.farm_visits for select to authenticated using(auth.uid() in (visitor_id,farm_owner_id));
create policy "notifications own read" on public.notifications for select to authenticated using(auth.uid()=user_id);
create policy "notifications own mark" on public.notifications for update to authenticated using(auth.uid()=user_id) with check(auth.uid()=user_id);

revoke all on public.profiles,public.farms,public.farm_plots,public.inventories,public.player_progress,public.friendships,public.farm_visits,public.notifications from anon,authenticated;
grant select(id,username,display_name,player_code,avatar_url,level,status,last_online_at,created_at,updated_at) on public.profiles to authenticated;
grant select on public.farms,public.farm_plots,public.inventories,public.player_progress,public.friendships,public.farm_visits,public.notifications to authenticated;
grant update(display_name,avatar_url) on public.profiles to authenticated;
grant update(is_read) on public.notifications to authenticated;

create or replace function public.handle_new_player() returns trigger language plpgsql security definer set search_path=public,extensions as $$
declare v_farm uuid; v_username text:=lower(btrim(coalesce(new.raw_user_meta_data->>'username',''))); v_name text:=btrim(coalesce(new.raw_user_meta_data->>'display_name',''));
declare prices integer[]:=array[0,0,0,500,800,1200,1800,2500,3500,5000,7000,10000,14000,19000,25000,32000,40000,50000,65000,80000,100000,130000,170000,220000];
begin
 if v_username !~ '^[a-zA-Z0-9_]{3,24}$' then raise exception 'USERNAME_INVALID'; end if;
 if char_length(v_name)<1 then raise exception 'DISPLAY_NAME_REQUIRED'; end if;
 insert into public.profiles(id,username,display_name) values(new.id,v_username,v_name);
 insert into public.farms(user_id,farm_name) values(new.id,'Nông trại của '||v_name) returning id into v_farm;
 insert into public.farm_plots(user_id,farm_id,plot_index,is_unlocked,unlock_price,status)
 select new.id,v_farm,i,i<=3,prices[i],case when i<=3 then 'empty' else 'locked' end from generate_series(1,24)i;
 insert into public.inventories(user_id,item_id,item_type,quantity) values
 (new.id,'seed:cabbage','seed',10),(new.id,'seed:carrot','seed',5),(new.id,'fertilizer:small','fertilizer',2);
 insert into public.player_progress(user_id) values(new.id);
 return new;
end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_player();

create or replace function public.username_available(candidate text) returns boolean language sql stable security definer set search_path=public as $$
 select candidate ~ '^[a-zA-Z0-9_]{3,24}$' and not exists(select 1 from profiles where username=lower(candidate));
$$;

create or replace function public.search_players(term text, page_offset integer default 0, page_size integer default 20)
returns table(id uuid,username text,display_name text,player_code text,avatar_url text,level integer,status text,last_online_at timestamptz)
language sql stable security definer set search_path=public as $$
 select p.id,p.username::text,p.display_name,p.player_code,p.avatar_url,p.level,p.status,p.last_online_at from profiles p
 where p.id<>auth.uid() and (p.username ilike '%'||term||'%' or p.display_name ilike '%'||term||'%' or p.player_code ilike '%'||term||'%')
 order by p.display_name limit least(greatest(page_size,1),30) offset greatest(page_offset,0);
$$;

create or replace function public.send_friend_request(target uuid) returns uuid language plpgsql security definer set search_path=public as $$
declare me uuid:=auth.uid(); rid uuid;
begin
 if me is null or target=me then raise exception 'INVALID_FRIEND_TARGET'; end if;
 if exists(select 1 from friendships where least(requester_id,addressee_id)=least(me,target) and greatest(requester_id,addressee_id)=greatest(me,target)) then raise exception 'FRIENDSHIP_EXISTS'; end if;
 insert into friendships(requester_id,addressee_id) values(me,target) returning id into rid;
 insert into notifications(user_id,type,title,message,sender_id,reference_id) values(target,'friend_request','Lời mời kết bạn','Có người muốn kết bạn với bạn.',me,rid);
 return rid;
end $$;

create or replace function public.respond_friend_request(request_id uuid,decision text) returns void language plpgsql security definer set search_path=public as $$
declare f friendships%rowtype;
begin
 select * into f from friendships where id=request_id for update;
 if f.id is null or f.addressee_id<>auth.uid() or f.status<>'pending' then raise exception 'REQUEST_NOT_AVAILABLE'; end if;
 if decision not in ('accepted','rejected','blocked') then raise exception 'INVALID_DECISION'; end if;
 update friendships set status=decision,updated_at=now() where id=request_id;
 if decision='accepted' then insert into notifications(user_id,type,title,message,sender_id,reference_id) values(f.requester_id,'friend_accepted','Đã trở thành bạn bè','Lời mời kết bạn của bạn đã được chấp nhận.',auth.uid(),request_id); end if;
end $$;

create or replace function public.remove_friend(friend_id uuid) returns void language plpgsql security definer set search_path=public as $$
begin delete from friendships where status='accepted' and auth.uid() in(requester_id,addressee_id) and friend_id in(requester_id,addressee_id); if not found then raise exception 'FRIEND_NOT_FOUND'; end if; end $$;

create or replace function public.cancel_friend_request(request_id uuid) returns void language plpgsql security definer set search_path=public as $$
begin delete from friendships where id=request_id and requester_id=auth.uid() and status='pending'; if not found then raise exception 'REQUEST_NOT_AVAILABLE'; end if; delete from notifications where reference_id=request_id and type='friend_request'; end $$;

create or replace function public.get_friend_farm(owner_id uuid) returns jsonb language plpgsql security definer set search_path=public as $$
declare result jsonb;
begin
 if owner_id=auth.uid() or not public.are_friends(auth.uid(),owner_id) then raise exception 'FARM_ACCESS_DENIED'; end if;
 select jsonb_build_object('profile',jsonb_build_object('id',p.id,'username',p.username,'displayName',p.display_name,'playerCode',p.player_code,'avatarUrl',p.avatar_url,'level',p.level,'status',p.status,'lastOnlineAt',p.last_online_at),'state',g.state) into result
 from profiles p join game_saves g on g.user_id=p.id where p.id=owner_id;
 if result is null then raise exception 'FARM_NOT_FOUND'; end if;
 insert into farm_visits(visitor_id,farm_owner_id) values(auth.uid(),owner_id);
 insert into notifications(user_id,type,title,message,sender_id) values(owner_id,'farm_visit','Có khách ghé thăm','Một người bạn vừa ghé thăm nông trại.',auth.uid());
 return result;
end $$;

create or replace function public.touch_online() returns void language sql security definer set search_path=public as $$ update profiles set status='online',last_online_at=now(),updated_at=now() where id=auth.uid(); $$;
create or replace function public.set_offline() returns void language sql security definer set search_path=public as $$ update profiles set status='offline',last_online_at=now(),updated_at=now() where id=auth.uid(); $$;
create or replace function public.refresh_public_progress() returns void language plpgsql security definer set search_path=public as $$
declare s jsonb; fid uuid;
begin select state into s from game_saves where user_id=auth.uid(); if s is null then return; end if;
 update profiles set level=greatest(1,coalesce((s->'player'->>'level')::integer,1)),experience=greatest(0,coalesce((s->'player'->>'currentXp')::integer,0)),coins=greatest(0,coalesce((s->'player'->>'gold')::bigint,0)),updated_at=now() where id=auth.uid();
 update farms set farm_level=greatest(1,coalesce((s->'player'->>'level')::integer,1)),unlocked_plots=(select count(*) from jsonb_array_elements(s->'plots')p where coalesce((p->>'isUnlocked')::boolean,false)),total_harvested=greatest(0,coalesce((s->'stats'->>'harvested')::bigint,0)),updated_at=now() where user_id=auth.uid();
 select id into fid from farms where user_id=auth.uid();
 update farm_plots fp set is_unlocked=coalesce((p.value->>'isUnlocked')::boolean,false),crop_id=p.value->'cropInstance'->>'cropId',planted_at=nullif(p.value->'cropInstance'->>'plantedAt','')::timestamptz,harvest_ready_at=nullif(p.value->'cropInstance'->>'readyAt','')::timestamptz,status=case when not coalesce((p.value->>'isUnlocked')::boolean,false) then 'locked' when p.value->'cropInstance' is null then 'empty' when (p.value->'cropInstance'->>'readyAt')::timestamptz<=now() then 'ready' else 'growing' end,updated_at=now()
 from jsonb_array_elements(s->'plots') with ordinality p(value,idx) where fp.user_id=auth.uid() and fp.farm_id=fid and fp.plot_index=p.idx;
 insert into inventories(user_id,item_id,item_type,quantity,updated_at)
 select auth.uid(),i.value->>'id',i.value->>'itemType',greatest(0,(i.value->>'quantity')::integer),now() from jsonb_array_elements(s->'inventory')i
 on conflict(user_id,item_id) do update set item_type=excluded.item_type,quantity=excluded.quantity,updated_at=now();
 delete from inventories inv where inv.user_id=auth.uid() and not exists(select 1 from jsonb_array_elements(s->'inventory')i where i.value->>'id'=inv.item_id);
 insert into player_progress(user_id,current_level,current_exp,completed_tutorial,game_settings,updated_at) values(auth.uid(),greatest(1,coalesce((s->'player'->>'level')::integer,1)),greatest(0,coalesce((s->'player'->>'currentXp')::integer,0)),coalesce((s->>'tutorialStep')::integer,0)>=7,coalesce(s->'player'->'settings','{}'::jsonb),now())
 on conflict(user_id) do update set current_level=excluded.current_level,current_exp=excluded.current_exp,completed_tutorial=excluded.completed_tutorial,game_settings=excluded.game_settings,updated_at=now();
end $$;
create or replace function public.mark_legacy_migrated() returns void language sql security definer set search_path=public as $$ update profiles set migrated_at=coalesce(migrated_at,now()) where id=auth.uid(); $$;
revoke all on function public.are_friends(uuid,uuid),public.username_available(text),public.search_players(text,integer,integer),public.send_friend_request(uuid),public.respond_friend_request(uuid,text),public.remove_friend(uuid),public.cancel_friend_request(uuid),public.get_friend_farm(uuid),public.touch_online(),public.set_offline(),public.refresh_public_progress(),public.mark_legacy_migrated() from public,anon;
grant execute on function public.are_friends(uuid,uuid) to authenticated;
grant execute on function public.username_available(text) to anon,authenticated;
grant execute on function public.search_players(text,integer,integer) to authenticated;
grant execute on function public.send_friend_request(uuid),public.respond_friend_request(uuid,text),public.remove_friend(uuid),public.get_friend_farm(uuid),public.touch_online() to authenticated;
grant execute on function public.cancel_friend_request(uuid) to authenticated;
grant execute on function public.set_offline() to authenticated;
grant execute on function public.refresh_public_progress() to authenticated;
grant execute on function public.mark_legacy_migrated() to authenticated;

do $$ begin alter publication supabase_realtime add table public.friendships; exception when duplicate_object then null; end $$;
do $$ begin alter publication supabase_realtime add table public.notifications; exception when duplicate_object then null; end $$;
