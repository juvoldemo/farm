-- Atomic friend-farm crop theft. Apply after 005_fix_legacy_harvest.sql.
create table if not exists public.crop_thefts (
 id uuid primary key default gen_random_uuid(),
 visitor_id uuid not null references auth.users(id) on delete cascade,
 farm_owner_id uuid not null references auth.users(id) on delete cascade,
 crop_instance_id text not null,
 plot_index integer not null check(plot_index between 1 and 24),
 crop_id text not null references public.crop_definitions(id),
 percentage integer not null check(percentage between 10 and 15),
 quantity integer not null check(quantity>0),
 request_id uuid not null,
 created_at timestamptz not null default now(),
 check(visitor_id<>farm_owner_id),
 unique(crop_instance_id),
 unique(visitor_id,request_id)
);
create index if not exists crop_thefts_owner_created on public.crop_thefts(farm_owner_id,created_at desc);
create index if not exists crop_thefts_visitor_created on public.crop_thefts(visitor_id,created_at desc);

alter table public.crop_thefts enable row level security;
drop policy if exists "thefts participants read" on public.crop_thefts;
create policy "thefts participants read" on public.crop_thefts for select to authenticated
using(auth.uid() in(visitor_id,farm_owner_id));
revoke all on public.crop_thefts from public,anon,authenticated;
grant select on public.crop_thefts to authenticated;

create or replace function public.get_stolen_crop_ids(owner_id uuid) returns text[]
language plpgsql stable security definer set search_path=public as $$
begin
 if auth.uid() is null then raise exception 'AUTH_REQUIRED';end if;
 if owner_id=auth.uid() or not public.are_friends(auth.uid(),owner_id) then raise exception 'FARM_ACCESS_DENIED';end if;
 return coalesce((select array_agg(t.crop_instance_id) from crop_thefts t where t.farm_owner_id=owner_id),'{}'::text[]);
end $$;

create or replace function public.steal_friend_crop(p_owner_id uuid,p_plot_index integer,p_request_id uuid) returns jsonb
language plpgsql security definer set search_path=public as $$
declare
 me uuid:=auth.uid();owner_save game_saves%rowtype;visitor_save game_saves%rowtype;
 existing crop_thefts%rowtype;plot jsonb;instance jsonb;instance_id text;crop_id text;
 def crop_definitions%rowtype;percentage integer;quantity integer;state jsonb;
 capacity integer;total_items integer;
begin
 if me is null then raise exception 'AUTH_REQUIRED';end if;
 if p_owner_id=me or not public.are_friends(me,p_owner_id) then raise exception 'FARM_ACCESS_DENIED';end if;
 if p_plot_index not between 1 and 24 then raise exception 'PLOT_INVALID';end if;

 select * into existing from crop_thefts where visitor_id=me and request_id=p_request_id;
 if existing.id is not null then
  select * into visitor_save from game_saves where user_id=me;
  return jsonb_build_object('state',visitor_save.state,'cropInstanceId',existing.crop_instance_id,'cropId',existing.crop_id,'quantity',existing.quantity,'percentage',existing.percentage);
 end if;

 -- Stable lock order prevents visitor/owner cross-requests from deadlocking.
 perform user_id from game_saves where user_id in(me,p_owner_id) order by user_id for update;
 select * into owner_save from game_saves where user_id=p_owner_id;
 select * into visitor_save from game_saves where user_id=me;
 if owner_save.user_id is null or visitor_save.user_id is null then raise exception 'SAVE_NOT_FOUND';end if;

 plot:=owner_save.state->'plots'->(p_plot_index-1);
 instance:=plot->'cropInstance';
 if instance is null then raise exception 'CROP_NOT_FOUND';end if;
 if (instance->>'readyAt')::timestamptz>now() then raise exception 'CROP_NOT_READY';end if;
 instance_id:=instance->>'id';crop_id:=instance->>'cropId';
 if instance_id is null or crop_id is null then raise exception 'CROP_INVALID';end if;
 if exists(select 1 from crop_thefts where crop_instance_id=instance_id) then raise exception 'CROP_ALREADY_STOLEN';end if;

 select * into def from crop_definitions where id=crop_id and is_active;
 if def.id is null then raise exception 'CROP_NOT_FOUND';end if;
 percentage:=floor(random()*6+10);
 quantity:=greatest(1,round(def.base_yield*percentage/100.0));

 capacity:=coalesce((visitor_save.state->'player'->>'inventoryCapacity')::integer,100);
 select coalesce(sum((item->>'quantity')::integer),0) into total_items
 from jsonb_array_elements(coalesce(visitor_save.state->'inventory','[]')) item;
 total_items:=total_items+coalesce(jsonb_array_length(visitor_save.state->'specialSeeds'),0);
 if total_items+quantity>capacity then raise exception 'INVENTORY_FULL';end if;

 state:=game_inventory_change(visitor_save.state,'produce',crop_id,quantity);
 state:=jsonb_set(state,'{lastSavedAt}',to_jsonb(now()::text));
 insert into crop_thefts(visitor_id,farm_owner_id,crop_instance_id,plot_index,crop_id,percentage,quantity,request_id)
 values(me,p_owner_id,instance_id,p_plot_index,crop_id,percentage,quantity,p_request_id);
 update game_saves set state=steal_friend_crop.state,save_version=greatest(save_version,6) where user_id=me;
 insert into farm_visits(visitor_id,farm_owner_id,action_type,reward_received,metadata)
 values(me,p_owner_id,'theft',quantity,jsonb_build_object('plotIndex',p_plot_index,'cropId',crop_id,'cropInstanceId',instance_id,'percentage',percentage));
 insert into notifications(user_id,type,title,message,sender_id)
 values(p_owner_id,'crop_theft','Cây trồng bị lấy mất','Một người bạn đã lấy '||quantity||' '||def.name||' từ luống số '||p_plot_index||'.',me);
 return jsonb_build_object('state',state,'cropInstanceId',instance_id,'cropId',crop_id,'quantity',quantity,'percentage',percentage);
exception when unique_violation then
 raise exception 'CROP_ALREADY_STOLEN';
end $$;

-- Apply theft loss when the owner harvests. The owner always keeps at least one item.
create or replace function public.harvest_crop_v3(p_plot_index integer,p_request_id uuid) returns jsonb
language plpgsql security definer set search_path=public as $$
declare
 me uuid:=auth.uid();payload jsonb;def crop_definitions%rowtype;bonus integer:=0;
 next_state jsonb;capacity integer;total_items integer;crop_id text;stolen_instance_id text;
 stolen integer:=0;deduction integer:=0;total_quantity integer;
begin
 if me is null then raise exception 'AUTH_REQUIRED';end if;
 if p_plot_index not between 1 and 24 then raise exception 'PLOT_INVALID';end if;
 select h.result into payload from harvest_logs h where h.owner_id=me and h.request_id=p_request_id;
 if payload is not null then return payload;end if;

 select g.state->'plots'->(p_plot_index-1)->'cropInstance'->>'id' into stolen_instance_id
 from game_saves g where g.user_id=me;
 payload:=public.harvest_crop_v2(p_plot_index,p_request_id);
 select pc.crop_id into crop_id
 from harvest_logs h join player_crops pc on pc.id=h.crop_instance_id
 where h.owner_id=me and h.request_id=p_request_id;
 select * into def from crop_definitions where id=crop_id;
 if def.id is not null and random()<def.bonus_yield_chance then
  bonus:=floor(random()*(def.bonus_yield_max-def.bonus_yield_min+1)+def.bonus_yield_min);
 end if;

 next_state:=payload->'state';
 capacity:=coalesce((next_state->'player'->>'inventoryCapacity')::integer,100);
 select coalesce(sum((item->>'quantity')::integer),0) into total_items
 from jsonb_array_elements(coalesce(next_state->'inventory','[]')) item;
 bonus:=greatest(0,least(bonus,capacity-total_items));
 if bonus>0 then
  next_state:=game_inventory_change(next_state,'produce',crop_id,bonus);
  next_state:=jsonb_set(next_state,'{stats,harvested}',to_jsonb(coalesce((next_state->'stats'->>'harvested')::integer,0)+bonus));
 end if;

 select coalesce(sum(t.quantity),0) into stolen from crop_thefts t where t.crop_instance_id=stolen_instance_id;
 total_quantity:=coalesce((payload->>'quantity')::integer,0)+bonus;
 deduction:=least(stolen,greatest(0,total_quantity-1));
 if deduction>0 then
  next_state:=game_inventory_change(next_state,'produce',crop_id,-deduction);
  next_state:=jsonb_set(next_state,'{stats,harvested}',to_jsonb(greatest(0,coalesce((next_state->'stats'->>'harvested')::integer,0)-deduction)));
 end if;

 payload:=jsonb_set(payload,'{state}',next_state);
 payload:=jsonb_set(payload,'{quantity}',to_jsonb(total_quantity-deduction));
 payload:=jsonb_set(payload,'{economyBonusQuantity}',to_jsonb(bonus));
 payload:=jsonb_set(payload,'{stolenQuantity}',to_jsonb(deduction));
 update game_saves g set state=next_state,save_version=greatest(g.save_version,6) where g.user_id=me;
 update harvest_logs h set result=payload where h.owner_id=me and h.request_id=p_request_id;
 return payload;
end $$;

revoke all on function public.get_stolen_crop_ids(uuid),public.steal_friend_crop(uuid,integer,uuid),public.harvest_crop_v3(integer,uuid) from public,anon;
grant execute on function public.get_stolen_crop_ids(uuid),public.steal_friend_crop(uuid,integer,uuid),public.harvest_crop_v3(integer,uuid) to authenticated;
