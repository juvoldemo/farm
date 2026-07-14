-- Long-term economy v6. Existing balances, inventory, unlocked plots and planted crops are preserved.
alter table public.crop_definitions add column if not exists unlock_level integer not null default 1 check(unlock_level>0);
alter table public.crop_definitions add column if not exists sell_price integer not null default 1 check(sell_price>0);
alter table public.crop_definitions add column if not exists bonus_yield_min integer not null default 1 check(bonus_yield_min>=0);
alter table public.crop_definitions add column if not exists bonus_yield_max integer not null default 2 check(bonus_yield_max>=bonus_yield_min);
alter table public.crop_definitions add column if not exists bonus_yield_chance numeric not null default .25 check(bonus_yield_chance between 0 and 1);
alter table public.crop_definitions add column if not exists economy_tier text not null default 'short' check(economy_tier in('short','medium','long','very-long'));
alter table public.crop_definitions add column if not exists repeatable_harvest boolean not null default false;
alter table public.crop_definitions add column if not exists regrow_seconds integer check(regrow_seconds is null or regrow_seconds>0);

insert into public.crop_definitions(id,name,base_growth_seconds,min_growth_seconds,base_yield,min_yield,max_yield,xp_reward,seed_price,icon,unlock_level,sell_price,bonus_yield_min,bonus_yield_max,bonus_yield_chance,economy_tier) values
('cabbage','Cải xanh',11700,7020,4,3,5,4,150,'🥬',1,110,1,2,.35,'short'),
('carrot','Cà rốt',13500,8100,4,3,5,8,190,'🥕',2,140,1,2,.35,'short'),
('corn','Ngô',15300,9180,5,4,6,18,240,'🌽',3,140,1,2,.32,'short'),
('tomato','Cà chua',17100,10260,5,4,6,30,290,'🍅',5,170,1,2,.32,'short'),
('potato','Khoai tây',19800,11880,6,5,7,40,380,'🥔',7,180,1,3,.30,'short'),
('strawberry','Dâu tây',23400,14040,7,5,8,50,520,'🍓',9,220,1,3,.30,'medium'),
('watermelon','Dưa hấu',27000,16200,8,6,9,100,670,'🍉',11,240,1,4,.27,'medium'),
('pumpkin','Bí đỏ',32400,19440,8,6,9,140,890,'🎃',13,310,1,4,.27,'medium'),
('grape','Nho',37800,22680,9,7,11,220,1150,'🍇',15,330,1,5,.24,'medium'),
('pepper','Ớt chuông',43200,25920,9,7,11,310,1500,'🫑',17,420,1,5,.22,'long'),
('pineapple','Dứa',59400,35640,10,8,12,480,2400,'🍍',20,580,1,6,.20,'long'),
('dragonfruit','Thanh long',86400,51840,12,9,14,750,4300,'🐉',24,830,1,8,.18,'very-long')
on conflict(id) do update set base_growth_seconds=excluded.base_growth_seconds,min_growth_seconds=excluded.min_growth_seconds,base_yield=excluded.base_yield,min_yield=excluded.min_yield,max_yield=excluded.max_yield,seed_price=excluded.seed_price,unlock_level=excluded.unlock_level,sell_price=excluded.sell_price,bonus_yield_min=excluded.bonus_yield_min,bonus_yield_max=excluded.bonus_yield_max,bonus_yield_chance=excluded.bonus_yield_chance,economy_tier=excluded.economy_tier,updated_at=now();

-- The v3 planting endpoint adds an authoritative level check and delegates the atomic write to v2.
create or replace function public.plant_crop_v3(p_plot_index integer,p_crop_id text,p_seed_instance_id uuid default null) returns jsonb
language plpgsql security definer set search_path=public as $$
declare me uuid:=auth.uid();required integer;player_level integer;
begin
 if me is null then raise exception 'AUTH_REQUIRED';end if;
 select unlock_level into required from crop_definitions where id=p_crop_id and is_active;
 select coalesce((state->'player'->>'level')::integer,1) into player_level from game_saves where user_id=me;
 if required is null then raise exception 'CROP_NOT_FOUND';end if;
 if player_level<required then raise exception 'LEVEL_REQUIRED';end if;
 return public.plant_crop_v2(p_plot_index,p_crop_id,p_seed_instance_id);
end $$;

-- v3 augments v2 with the centrally configured optional bonus yield and remains idempotent by request id.
create or replace function public.harvest_crop_v3(p_plot_index integer,p_request_id uuid) returns jsonb
language plpgsql security definer set search_path=public as $$
declare me uuid:=auth.uid();payload jsonb;def crop_definitions%rowtype;bonus integer:=0;next_state jsonb;capacity integer;total_items integer;crop_id text;crop_status text;mature_at timestamptz;
begin
 if me is null then raise exception 'AUTH_REQUIRED';end if;
 if p_plot_index not between 1 and 24 then raise exception 'PLOT_INVALID';end if;
 select h.result into payload from harvest_logs h where h.owner_id=me and h.request_id=p_request_id;
 if payload is not null then return payload;end if;
 select pc.crop_id,pc.status,pc.ready_at into crop_id,crop_status,mature_at from player_crops pc where pc.owner_id=me and pc.plot_index=p_plot_index order by pc.created_at desc limit 1;
 if crop_id is null then raise exception 'CROP_NOT_FOUND';end if;
 if crop_status='harvested' then raise exception 'ALREADY_HARVESTED';end if;
 if crop_status not in('growing','ready') then raise exception 'HARVEST_IN_PROGRESS';end if;
 if mature_at>now() then raise exception 'CROP_NOT_MATURE';end if;
 begin
  payload:=public.harvest_crop_v2(p_plot_index,p_request_id);
 exception when others then
  if sqlerrm like '%CROP_NOT_FOUND%' and exists(select 1 from player_crops pc where pc.owner_id=me and pc.plot_index=p_plot_index and pc.status='harvested') then raise exception 'ALREADY_HARVESTED';end if;
  raise;
 end;
 select pc.crop_id into crop_id from harvest_logs h join player_crops pc on pc.id=h.crop_instance_id where h.owner_id=me and h.request_id=p_request_id;
 select * into def from crop_definitions where id=crop_id;
 if def.id is not null and random()<def.bonus_yield_chance then bonus:=floor(random()*(def.bonus_yield_max-def.bonus_yield_min+1)+def.bonus_yield_min);end if;
 next_state:=payload->'state';capacity:=coalesce((next_state->'player'->>'inventoryCapacity')::integer,100);
 select coalesce(sum((item->>'quantity')::integer),0) into total_items from jsonb_array_elements(coalesce(next_state->'inventory','[]')) item;
 bonus:=greatest(0,least(bonus,capacity-total_items));
 if bonus>0 then
  next_state:=game_inventory_change(next_state,'produce',crop_id,bonus);
  next_state:=jsonb_set(next_state,'{stats,harvested}',to_jsonb(coalesce((next_state->'stats'->>'harvested')::integer,0)+bonus));
 end if;
 payload:=jsonb_set(payload,'{state}',next_state);payload:=jsonb_set(payload,'{quantity}',to_jsonb(coalesce((payload->>'quantity')::integer,0)+bonus));payload:=jsonb_set(payload,'{economyBonusQuantity}',to_jsonb(bonus));
 update game_saves g set state=next_state,save_version=greatest(g.save_version,6) where g.user_id=me;
 update harvest_logs h set result=payload where h.owner_id=me and h.request_id=p_request_id;
 return payload;
end $$;

-- Update only plot prices/requirements in JSON. isUnlocked, gold, inventory and crop timestamps are untouched.
with balance(plot_number,price,required_level) as (values
 (1,0,1),(2,0,1),(3,0,1),(4,2500,2),(5,4000,3),(6,5500,4),(7,11500,5),(8,13500,6),(9,26000,7),(10,29000,8),(11,41500,9),(12,46000,10),(13,77500,11),(14,84000,12),(15,115000,13),(16,123500,14),(17,197500,15),(18,210000,16),(19,320000,17),(20,400000,18),(21,610000,20),(22,680000,22),(23,1050000,24),(24,1200000,26)
), rebuilt as (
 select g.user_id,jsonb_agg(jsonb_set(jsonb_set(p.value,'{unlockPrice}',to_jsonb(b.price),true),'{requiredLevel}',to_jsonb(b.required_level),true) order by p.idx) plots
 from game_saves g cross join lateral jsonb_array_elements(g.state->'plots') with ordinality p(value,idx) join balance b on b.plot_number=p.idx group by g.user_id
)
update game_saves g set state=jsonb_set(g.state,'{plots}',r.plots,true),save_version=greatest(g.save_version,6) from rebuilt r where r.user_id=g.user_id;

revoke all on function public.plant_crop_v3(integer,text,uuid),public.harvest_crop_v3(integer,uuid) from public,anon;
grant execute on function public.plant_crop_v3(integer,text,uuid),public.harvest_crop_v3(integer,uuid) to authenticated;
