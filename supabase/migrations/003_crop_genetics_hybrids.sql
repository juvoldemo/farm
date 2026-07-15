-- Chạy sau 002_multiplayer_social.sql. Nên backup database trước khi chạy production.
create table if not exists public.crop_definitions (
 id text primary key, name text not null, base_growth_seconds integer not null check(base_growth_seconds>0),
 min_growth_seconds integer not null check(min_growth_seconds>0), base_yield integer not null,
 min_yield integer not null, max_yield integer not null, xp_reward integer not null, seed_price integer not null,
 icon text not null default '🌱', is_active boolean not null default true, updated_at timestamptz not null default now()
);
insert into public.crop_definitions(id,name,base_growth_seconds,min_growth_seconds,base_yield,min_yield,max_yield,xp_reward,seed_price,icon) values
('cabbage','Cải xanh',1200,720,4,3,7,4,10,'🥬'),('carrot','Cà rốt',3600,2160,4,3,7,8,25,'🥕'),
('corn','Ngô',12000,7200,5,4,8,18,60,'🌽'),('tomato','Cà chua',36000,21600,6,5,9,30,120,'🍅'),
('potato','Khoai tây',54000,32400,7,5,9,40,180,'🥔'),('strawberry','Dâu tây',72000,43200,8,7,11,50,250,'🍓'),
('watermelon','Dưa hấu',216000,129600,5,4,7,100,650,'🍉'),('pumpkin','Bí đỏ',360000,216000,6,4,8,140,900,'🎃'),
('grape','Nho',576000,345600,8,6,10,220,1500,'🍇'),('pepper','Ớt chuông',864000,518400,8,6,11,310,2200,'🫑'),
('pineapple','Dứa',1296000,777600,5,3,7,480,3800,'🍍'),('dragonfruit','Thanh long',1728000,1036800,5,3,7,750,7000,'🌺')
on conflict(id) do update set name=excluded.name,base_growth_seconds=excluded.base_growth_seconds,min_growth_seconds=excluded.min_growth_seconds,base_yield=excluded.base_yield,min_yield=excluded.min_yield,max_yield=excluded.max_yield,xp_reward=excluded.xp_reward,seed_price=excluded.seed_price,icon=excluded.icon,updated_at=now();

create table if not exists public.trait_definitions (
 id text primary key, name text not null, icon text not null, values_by_level jsonb not null,
 description text not null, is_active boolean not null default true
);
insert into public.trait_definitions values
('fast_growth','Lớn nhanh','⚡','[0.05,0.10,0.15]','Giảm thời gian sinh trưởng',true),a
('high_yield','Sai quả','🧺','[0.05,0.10,0.20]','Tăng sản lượng',true),
('high_quality','Chất lượng cao','✨','[0.05,0.10,0.15]','Tăng chất lượng',true),
('drought_resistant','Chịu hạn','🌵','[0.15,0.30,0.50]','Chịu khô lâu hơn',true),
('rain_loving','Ưa mưa','🌧️','[0.05,0.10,0.15]','Tăng sản lượng khi gặp mưa',true),
('giant_fruit','Quả khổng lồ','🏆','[0.02,0.05,0.10]','Cơ hội nhận quả khổng lồ',true),
('good_seed','Hạt giống tốt','🌰','[0.05,0.10,0.20]','Tăng cơ hội nhận hạt',true),
('easy_hybrid','Dễ lai','🧬','[0.05,0.10,0.20]','Tăng cơ hội lai',true)
on conflict(id) do update set name=excluded.name,icon=excluded.icon,values_by_level=excluded.values_by_level,description=excluded.description,is_active=excluded.is_active;

create table if not exists public.seed_instances (
 id uuid primary key default gen_random_uuid(), owner_id uuid not null references auth.users(id) on delete cascade,
 crop_id text not null references public.crop_definitions(id), rarity text not null default 'common' check(rarity in('common','uncommon','rare','epic','legendary')),
 traits jsonb not null default '[]'::jsonb check(jsonb_typeof(traits)='array'), source text not null default 'harvest' check(source in('shop','harvest','hybrid','event','reward')),
 parent_seed_ids uuid[] not null default '{}', generation integer not null default 0 check(generation>=0), hybrid_id text,
 request_id uuid,
 status text not null default 'inventory' check(status in('inventory','planted','pending','consumed')),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index if not exists seed_instances_owner_status on public.seed_instances(owner_id,status,created_at desc);
create index if not exists seed_instances_owner_crop on public.seed_instances(owner_id,crop_id);
alter table public.seed_instances add column if not exists request_id uuid;
create unique index if not exists seed_instances_owner_request on public.seed_instances(owner_id,request_id) where request_id is not null;

create table if not exists public.player_crops (
 id uuid primary key default gen_random_uuid(), owner_id uuid not null references auth.users(id) on delete cascade,
 plot_index integer not null check(plot_index between 1 and 24), crop_id text not null references public.crop_definitions(id),
 seed_instance_id uuid references public.seed_instances(id) on delete set null, rarity text not null default 'common', traits jsonb not null default '[]'::jsonb,
 generation integer not null default 0, hybrid_id text, planted_at timestamptz not null, ready_at timestamptz not null,
 calculated_growth_seconds integer not null, care_data jsonb not null default '{}'::jsonb, weather_data jsonb not null default '{}'::jsonb,
 status text not null default 'growing' check(status in('growing','ready','harvesting','harvested')),
 harvest_token uuid, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create unique index if not exists player_crops_one_active_plot on public.player_crops(owner_id,plot_index) where status in('growing','ready','harvesting');
create index if not exists player_crops_owner_ready on public.player_crops(owner_id,ready_at) where status in('growing','ready');

create table if not exists public.hybrid_recipes (
 id text primary key,parent_crop_a_id text not null references public.crop_definitions(id),parent_crop_b_id text not null references public.crop_definitions(id),
 result_crop_id text not null references public.crop_definitions(id),result_hybrid_id text not null,display_name text not null,base_chance numeric not null check(base_chance between 0 and .5),
 result_rarity text not null,allowed_traits jsonb not null default '[]',description text not null,hint text not null,is_active boolean not null default true
);
insert into public.hybrid_recipes values
('tomato-pepper','tomato','pepper','tomato','spicy-tomato','Cà chua cay',.08,'rare','["high_yield","high_quality","easy_hybrid"]','Cà chua mọng với sức sống của ớt.','Một loại quả đỏ kết hợp với một loại cây cay.',true),
('pumpkin-watermelon','pumpkin','watermelon','pumpkin','striped-pumpkin','Bí sọc khổng lồ',.04,'epic','["giant_fruit","high_yield","drought_resistant"]','Bí đỏ mang những đường sọc mát lành.','Hai loại quả lớn của mùa hè.',true),
('corn-cabbage','corn','cabbage','corn','emerald-corn','Ngô ngọc xanh',.08,'rare','["fast_growth","rain_loving","good_seed"]','Bắp ngô xanh khỏe và dễ thích nghi.','Bắp vàng đứng cạnh một luống rau xanh.',true)
on conflict(id) do update set base_chance=excluded.base_chance,result_rarity=excluded.result_rarity,allowed_traits=excluded.allowed_traits,description=excluded.description,hint=excluded.hint,is_active=excluded.is_active;

create table if not exists public.player_hybrid_discoveries (
 owner_id uuid not null references auth.users(id) on delete cascade,recipe_id text not null references public.hybrid_recipes(id),
 discovered_at timestamptz not null default now(),total_created integer not null default 1,highest_generation integer not null default 1,
 primary key(owner_id,recipe_id)
);
create table if not exists public.pending_seed_rewards (
 id uuid primary key default gen_random_uuid(),owner_id uuid not null references auth.users(id) on delete cascade,
 seed_instance_id uuid not null unique references public.seed_instances(id) on delete cascade,reason text not null,created_at timestamptz not null default now(),claimed_at timestamptz
);
create index if not exists pending_seed_rewards_owner on public.pending_seed_rewards(owner_id,created_at) where claimed_at is null;
create table if not exists public.harvest_logs (
 id uuid primary key default gen_random_uuid(),owner_id uuid not null references auth.users(id) on delete cascade,
 crop_instance_id uuid not null references public.player_crops(id),request_id uuid not null,result jsonb not null,created_at timestamptz not null default now(),
 unique(owner_id,request_id),unique(crop_instance_id)
);
create index if not exists harvest_logs_owner_created on public.harvest_logs(owner_id,created_at desc);

alter table public.crop_definitions enable row level security;alter table public.trait_definitions enable row level security;alter table public.seed_instances enable row level security;
alter table public.player_crops enable row level security;alter table public.hybrid_recipes enable row level security;alter table public.player_hybrid_discoveries enable row level security;
alter table public.pending_seed_rewards enable row level security;alter table public.harvest_logs enable row level security;
drop policy if exists "genetics config read" on public.crop_definitions;create policy "genetics config read" on public.crop_definitions for select to authenticated using(true);
drop policy if exists "traits config read" on public.trait_definitions;create policy "traits config read" on public.trait_definitions for select to authenticated using(true);
drop policy if exists "recipes config read" on public.hybrid_recipes;create policy "recipes config read" on public.hybrid_recipes for select to authenticated using(true);
drop policy if exists "own seeds read" on public.seed_instances;create policy "own seeds read" on public.seed_instances for select to authenticated using(owner_id=auth.uid());
drop policy if exists "own crops read" on public.player_crops;create policy "own crops read" on public.player_crops for select to authenticated using(owner_id=auth.uid());
drop policy if exists "own discoveries read" on public.player_hybrid_discoveries;create policy "own discoveries read" on public.player_hybrid_discoveries for select to authenticated using(owner_id=auth.uid());
drop policy if exists "own pending read" on public.pending_seed_rewards;create policy "own pending read" on public.pending_seed_rewards for select to authenticated using(owner_id=auth.uid());
drop policy if exists "own harvest logs read" on public.harvest_logs;create policy "own harvest logs read" on public.harvest_logs for select to authenticated using(owner_id=auth.uid());
revoke all on public.crop_definitions,public.trait_definitions,public.seed_instances,public.player_crops,public.hybrid_recipes,public.player_hybrid_discoveries,public.pending_seed_rewards,public.harvest_logs from anon,authenticated;
grant select on public.crop_definitions,public.trait_definitions,public.seed_instances,public.player_crops,public.hybrid_recipes,public.player_hybrid_discoveries,public.pending_seed_rewards,public.harvest_logs to authenticated;

create or replace function public.genetic_trait_value(input_traits jsonb,trait text) returns numeric language sql stable set search_path=public as $$
 select coalesce((select (d.values_by_level->>(least(3,greatest(1,(t->>'level')::integer))-1))::numeric from jsonb_array_elements(coalesce(input_traits,'[]'))t join trait_definitions d on d.id=trait where t->>'traitId'=trait limit 1),0);
$$;
create or replace function public.game_inventory_quantity(state jsonb,item_type text,reference_id text) returns integer language sql immutable as $$
 select coalesce((select (i->>'quantity')::integer from jsonb_array_elements(coalesce(state->'inventory','[]'))i where i->>'itemType'=item_type and i->>'referenceId'=reference_id limit 1),0);
$$;
create or replace function public.game_inventory_change(state jsonb,item_type text,reference_id text,delta integer) returns jsonb language plpgsql immutable as $$
declare items jsonb:=coalesce(state->'inventory','[]');idx integer;old_qty integer;new_qty integer;
begin
 select ord-1,(item->>'quantity')::integer into idx,old_qty from jsonb_array_elements(items) with ordinality x(item,ord) where item->>'itemType'=item_type and item->>'referenceId'=reference_id limit 1;
 new_qty:=coalesce(old_qty,0)+delta;if new_qty<0 then raise exception 'NOT_ENOUGH_ITEM';end if;
 if idx is null and new_qty>0 then items:=items||jsonb_build_array(jsonb_build_object('id',item_type||':'||reference_id,'itemType',item_type,'referenceId',reference_id,'quantity',new_qty));
 elsif idx is not null and new_qty=0 then select coalesce(jsonb_agg(item order by ord),'[]') into items from jsonb_array_elements(items) with ordinality x(item,ord) where ord-1<>idx;
 elsif idx is not null then items:=jsonb_set(items,array[idx::text,'quantity'],to_jsonb(new_qty));end if;
 return jsonb_set(state,'{inventory}',items,true);
end $$;

create or replace function public.plant_crop_v2(p_plot_index integer,p_crop_id text,p_seed_instance_id uuid default null) returns jsonb language plpgsql security definer set search_path=public as $$
declare me uuid:=auth.uid();save_row game_saves%rowtype;plot jsonb;def crop_definitions%rowtype;seed seed_instances%rowtype;traits jsonb:='[]';rarity text:='common';generation integer:=0;hybrid text;duration integer;fast numeric;now_at timestamptz:=now();crop_uuid uuid:=gen_random_uuid();instance jsonb;qty integer;state jsonb;special_json jsonb;
begin
 if me is null then raise exception 'AUTH_REQUIRED';end if;if p_plot_index not between 1 and 24 then raise exception 'PLOT_INVALID';end if;
 select * into save_row from game_saves where user_id=me for update;if save_row.user_id is null then raise exception 'SAVE_NOT_FOUND';end if;
 select * into def from crop_definitions where id=p_crop_id and is_active;if def.id is null then raise exception 'CROP_NOT_FOUND';end if;
 plot:=save_row.state->'plots'->(p_plot_index-1);if not coalesce((plot->>'isUnlocked')::boolean,false) then raise exception 'PLOT_LOCKED';end if;if plot->'cropInstance' is not null then raise exception 'PLOT_OCCUPIED';end if;
 state:=save_row.state;
 if p_seed_instance_id is not null then select * into seed from seed_instances where id=p_seed_instance_id and owner_id=me and status='inventory' for update;if seed.id is null or seed.crop_id<>p_crop_id then raise exception 'SEED_NOT_OWNED';end if;traits:=seed.traits;rarity:=seed.rarity;generation:=seed.generation;hybrid:=seed.hybrid_id;update seed_instances set status='planted',updated_at=now_at where id=seed.id;
  select coalesce(jsonb_agg(value) filter(where value->>'id'<>p_seed_instance_id::text),'[]') into special_json from jsonb_array_elements(coalesce(state->'specialSeeds','[]'));state:=jsonb_set(state,'{specialSeeds}',special_json,true);
 else qty:=game_inventory_quantity(state,'seed',p_crop_id);if qty>0 then state:=game_inventory_change(state,'seed',p_crop_id,-1);else if coalesce((state->'player'->>'gold')::integer,0)<def.seed_price then raise exception 'NOT_ENOUGH_GOLD';end if;state:=jsonb_set(state,'{player,gold}',to_jsonb((state->'player'->>'gold')::integer-def.seed_price));end if;end if;
 fast:=genetic_trait_value(traits,'fast_growth');duration:=greatest(def.min_growth_seconds,round(def.base_growth_seconds*(1-fast))::integer);
 instance:=jsonb_build_object('id',crop_uuid::text,'cropId',p_crop_id,'plotId',plot->>'id','plantedAt',now_at,'readyAt',now_at+make_interval(secs=>duration),'baseGrowthDuration',def.base_growth_seconds,'calculatedGrowthDuration',duration,'totalReductionSeconds',def.base_growth_seconds-duration,'fertilizerUsage','[]'::jsonb,'lastCalculatedAt',now_at,'plantedSeedInstanceId',p_seed_instance_id,'rarity',rarity,'traits',traits,'weatherEffects',jsonb_build_object('rainExperienced',false),'source',coalesce(seed.source,'shop'),'parentSeedIds',coalesce(to_jsonb(seed.parent_seed_ids),'[]'),'generation',generation,'hybridId',hybrid,'care',jsonb_build_object('water',50,'weeds',false,'pests',false));
 plot:=jsonb_set(plot,'{cropInstance}',instance,true);state:=jsonb_set(state,array['plots',(p_plot_index-1)::text],plot);state:=jsonb_set(state,'{stats,planted}',to_jsonb(coalesce((state->'stats'->>'planted')::integer,0)+1));state:=jsonb_set(state,'{lastSavedAt}',to_jsonb(now_at::text));
 update game_saves set state=plant_crop_v2.state,save_version=greatest(save_version,5) where user_id=me;
 update player_crops set status='harvested',updated_at=now_at where owner_id=me and plot_index=p_plot_index and status in('growing','ready','harvesting');insert into player_crops(id,owner_id,plot_index,crop_id,seed_instance_id,rarity,traits,generation,hybrid_id,planted_at,ready_at,calculated_growth_seconds,care_data,weather_data) values(crop_uuid,me,p_plot_index,p_crop_id,p_seed_instance_id,rarity,traits,generation,hybrid,now_at,now_at+make_interval(secs=>duration),duration,instance->'care',instance->'weatherEffects');
 return jsonb_build_object('state',state,'cropInstance',instance);
end $$;

create or replace function public.harvest_crop_v2(p_plot_index integer,p_request_id uuid) returns jsonb language plpgsql security definer set search_path=public as $$
declare me uuid:=auth.uid();existing jsonb;save_row game_saves%rowtype;pc player_crops%rowtype;def crop_definitions%rowtype;mate player_crops%rowtype;recipe hybrid_recipes%rowtype;base_qty integer;final_qty integer;bonus numeric;quality text:='normal';giant integer:=0;chance numeric:=0;hybrid_seed seed_instances%rowtype;returned_seed seed_instances%rowtype;new_traits jsonb:='[]';new_generation integer;new_rarity text;state jsonb;plot jsonb;result jsonb;total_items integer;seed_status text:='inventory';returned_status text:='inventory';trait jsonb;mutation_id text;
begin
 if me is null then raise exception 'AUTH_REQUIRED';end if;select h.result into existing from harvest_logs h where h.owner_id=me and h.request_id=p_request_id;if existing is not null then return existing;end if;
 select * into save_row from game_saves where user_id=me for update;
 if save_row.user_id is null then raise exception 'SAVE_NOT_FOUND';end if;
 plot:=save_row.state->'plots'->(p_plot_index-1);
 if plot->'cropInstance' is null then raise exception 'CROP_NOT_FOUND';end if;

 -- Cây được trồng trước migration 003 có thể chỉ tồn tại trong game_saves.
 -- Tự tạo bản ghi chuẩn hóa để người chơi vẫn thu hoạch được cây cũ.
 select * into pc
 from player_crops
 where owner_id=me and plot_index=p_plot_index and status in('growing','ready','harvesting')
 for update;
 if pc.id is null then
  insert into player_crops(
   owner_id,plot_index,crop_id,rarity,traits,generation,hybrid_id,
   planted_at,ready_at,calculated_growth_seconds,care_data,weather_data,status
  )
  select
   me,p_plot_index,crop->>'cropId',coalesce(crop->>'rarity','common'),
   coalesce(crop->'traits','[]'::jsonb),coalesce((crop->>'generation')::integer,0),crop->>'hybridId',
   (crop->>'plantedAt')::timestamptz,(crop->>'readyAt')::timestamptz,
   greatest(1,coalesce((crop->>'calculatedGrowthDuration')::integer,(crop->>'baseGrowthDuration')::integer,1)),
   coalesce(crop->'care','{}'::jsonb),coalesce(crop->'weatherEffects','{}'::jsonb),
   case when (crop->>'readyAt')::timestamptz<=now() then 'ready' else 'growing' end
  from (select plot->'cropInstance' as crop) legacy
  where exists(select 1 from crop_definitions d where d.id=crop->>'cropId')
  on conflict(owner_id,plot_index) where status in('growing','ready','harvesting') do nothing;

  select * into pc
  from player_crops
  where owner_id=me and plot_index=p_plot_index and status in('growing','ready','harvesting')
  for update;
 end if;
 if pc.id is null then raise exception 'CROP_NOT_FOUND';end if;
 pc.ready_at:=(plot->'cropInstance'->>'readyAt')::timestamptz;pc.traits:=coalesce(plot->'cropInstance'->'traits','[]');pc.care_data:=coalesce(plot->'cropInstance'->'care','{}');pc.weather_data:=coalesce(plot->'cropInstance'->'weatherEffects','{}');
 if pc.ready_at>now() then raise exception 'CROP_NOT_READY';end if;update player_crops set status='harvesting',harvest_token=p_request_id,ready_at=pc.ready_at,traits=pc.traits,care_data=pc.care_data,weather_data=pc.weather_data where id=pc.id;
 select * into def from crop_definitions where id=pc.crop_id;base_qty:=floor(random()*(def.max_yield-def.min_yield+1)+def.min_yield);bonus:=least(1,genetic_trait_value(pc.traits,'high_yield')+case when coalesce((pc.weather_data->>'rainExperienced')::boolean,false) then genetic_trait_value(pc.traits,'rain_loving') else 0 end);final_qty:=greatest(1,round(base_qty*(1+bonus)));
 if random()<genetic_trait_value(pc.traits,'high_quality')/3 then quality:='gold';elsif random()<genetic_trait_value(pc.traits,'high_quality') then quality:='silver';end if;if random()<genetic_trait_value(pc.traits,'giant_fruit') then giant:=1;final_qty:=final_qty+1;end if;
 select * into mate from player_crops m where m.owner_id=me and m.id<>pc.id and m.status in('growing','ready') and m.ready_at<=now() and (m.crop_id=pc.crop_id or exists(select 1 from hybrid_recipes hr where hr.is_active and ((hr.parent_crop_a_id=pc.crop_id and hr.parent_crop_b_id=m.crop_id)or(hr.parent_crop_a_id=m.crop_id and hr.parent_crop_b_id=pc.crop_id)))) and ((abs(m.plot_index-pc.plot_index)=1 and (m.plot_index-1)/6=(pc.plot_index-1)/6) or abs(m.plot_index-pc.plot_index)=6) order by m.ready_at limit 1;
 if mate.id is not null then select * into recipe from hybrid_recipes r where r.is_active and ((r.parent_crop_a_id=pc.crop_id and r.parent_crop_b_id=mate.crop_id)or(r.parent_crop_a_id=mate.crop_id and r.parent_crop_b_id=pc.crop_id)) limit 1;chance:=least(.5,coalesce(recipe.base_chance,.06)+genetic_trait_value(pc.traits,'easy_hybrid')+genetic_trait_value(mate.traits,'easy_hybrid'));
  if random()<chance then
   for trait in
    select distinct on (candidate.value->>'traitId') candidate.value
    from (
     select value from jsonb_array_elements(pc.traits)
     union all
     select value from jsonb_array_elements(mate.traits)
    ) as candidate
    order by candidate.value->>'traitId'
   loop
    if (recipe.id is null or recipe.allowed_traits ? (trait->>'traitId'))
       and random() < (
        case when exists(
         select 1
         from jsonb_array_elements(pc.traits) as parent_a(value)
         cross join jsonb_array_elements(mate.traits) as parent_b(value)
         where parent_a.value->>'traitId'=trait->>'traitId'
           and parent_b.value->>'traitId'=trait->>'traitId'
        ) then .70 else .35 end
       )
       and jsonb_array_length(new_traits)<3 then
      if random()<.10 then
       trait:=jsonb_set(trait,'{level}',to_jsonb(least(3,coalesce((trait->>'level')::integer,1)+1)));
      end if;
      new_traits:=new_traits||jsonb_build_array(trait);
    end if;
   end loop;
   if jsonb_array_length(new_traits)<3 and random()<.03 then
    select td.id into mutation_id
    from trait_definitions td
    where td.is_active
      and not exists(select 1 from jsonb_array_elements(new_traits) as inherited(value) where inherited.value->>'traitId'=td.id)
      and (recipe.id is null or recipe.allowed_traits ? td.id)
    order by random()
    limit 1;
    if mutation_id is not null then
     new_traits:=new_traits||jsonb_build_array(jsonb_build_object('traitId',mutation_id,'level',1,'value',0,'discovered',true));
    end if;
   end if;
   new_generation:=greatest(pc.generation,mate.generation)+1;
   new_rarity:=coalesce(
    recipe.result_rarity,
    case
     when pc.rarity='common' then 'uncommon'
     when pc.rarity='uncommon' then 'rare'
     when pc.rarity='rare' then 'epic'
     else 'legendary'
    end
   );
   select coalesce(sum((item->>'quantity')::integer),0)
   into total_items
   from jsonb_array_elements(coalesce(save_row.state->'inventory','[]')) as inv(item);
   total_items:=total_items+coalesce(jsonb_array_length(save_row.state->'specialSeeds'),0);
   if total_items+final_qty>=coalesce((save_row.state->'player'->>'inventoryCapacity')::integer,100) then
    seed_status:='pending';
   end if;
   insert into seed_instances(owner_id,crop_id,rarity,traits,source,parent_seed_ids,generation,hybrid_id,status)
   values(
    me,coalesce(recipe.result_crop_id,pc.crop_id),new_rarity,new_traits,'hybrid',
    array_remove(array[pc.seed_instance_id,mate.seed_instance_id]::uuid[],null),
    new_generation,recipe.result_hybrid_id,seed_status
   ) returning * into hybrid_seed;
   if seed_status='pending' then
    if (select count(*) from pending_seed_rewards where owner_id=me and claimed_at is null)>=50 then
     raise exception 'PENDING_SEED_LIMIT';
    end if;
    insert into pending_seed_rewards(owner_id,seed_instance_id,reason)
    values(me,hybrid_seed.id,'inventory_full');
   end if;
   if recipe.id is not null then
    insert into player_hybrid_discoveries(owner_id,recipe_id,total_created,highest_generation)
    values(me,recipe.id,1,new_generation)
    on conflict(owner_id,recipe_id) do update set
     total_created=player_hybrid_discoveries.total_created+1,
     highest_generation=greatest(player_hybrid_discoveries.highest_generation,excluded.highest_generation);
   end if;
  end if;
 end if;
 if random()<least(.60,.05+genetic_trait_value(pc.traits,'good_seed')) then
  select coalesce(sum((item->>'quantity')::integer),0)
  into total_items
  from jsonb_array_elements(coalesce(save_row.state->'inventory','[]')) as inv(item);
  total_items:=total_items+coalesce(jsonb_array_length(save_row.state->'specialSeeds'),0);
  if hybrid_seed.id is not null and seed_status='inventory' then
   total_items:=total_items+1;
  end if;
  if total_items+final_qty>=coalesce((save_row.state->'player'->>'inventoryCapacity')::integer,100) then
   returned_status:='pending';
  end if;
  insert into seed_instances(owner_id,crop_id,rarity,traits,source,parent_seed_ids,generation,hybrid_id,status)
  values(
   me,pc.crop_id,pc.rarity,pc.traits,'harvest',
   case when pc.seed_instance_id is null then '{}'::uuid[] else array[pc.seed_instance_id] end,
   pc.generation,pc.hybrid_id,returned_status
  ) returning * into returned_seed;
  if returned_status='pending' then
   if (select count(*) from pending_seed_rewards where owner_id=me and claimed_at is null)>=50 then
    raise exception 'PENDING_SEED_LIMIT';
   end if;
   insert into pending_seed_rewards(owner_id,seed_instance_id,reason)
   values(me,returned_seed.id,'inventory_full');
  end if;
 end if;

 select coalesce(sum((item->>'quantity')::integer),0)
 into total_items
 from jsonb_array_elements(coalesce(save_row.state->'inventory','[]')) as inv(item);
 total_items:=total_items+coalesce(jsonb_array_length(save_row.state->'specialSeeds'),0);
 if total_items+final_qty>coalesce((save_row.state->'player'->>'inventoryCapacity')::integer,100) then
  raise exception 'INVENTORY_FULL';
 end if;

 state:=game_inventory_change(save_row.state,'produce',pc.crop_id,final_qty);
 plot:=state->'plots'->(p_plot_index-1);
 plot:=plot-'cropInstance';
 state:=jsonb_set(state,array['plots',(p_plot_index-1)::text],plot);
 state:=jsonb_set(state,'{player,currentXp}',to_jsonb(coalesce((state->'player'->>'currentXp')::integer,0)+def.xp_reward));
 state:=jsonb_set(state,'{stats,harvested}',to_jsonb(coalesce((state->'stats'->>'harvested')::integer,0)+final_qty));
 state:=jsonb_set(state,'{lastSavedAt}',to_jsonb(now()::text));
 if hybrid_seed.id is not null and seed_status='inventory' then
  state:=jsonb_set(state,'{specialSeeds}',coalesce(state->'specialSeeds','[]')||jsonb_build_array(jsonb_build_object(
   'id',hybrid_seed.id,'cropId',hybrid_seed.crop_id,'rarity',hybrid_seed.rarity,'traits',hybrid_seed.traits,
   'source','hybrid','parentSeedIds',hybrid_seed.parent_seed_ids,'generation',hybrid_seed.generation,
   'hybridId',hybrid_seed.hybrid_id,'status','inventory','createdAt',hybrid_seed.created_at,'updatedAt',hybrid_seed.updated_at
  )));
 end if;
 if returned_seed.id is not null and returned_status='inventory' then
  state:=jsonb_set(state,'{specialSeeds}',coalesce(state->'specialSeeds','[]')||jsonb_build_array(jsonb_build_object(
   'id',returned_seed.id,'cropId',returned_seed.crop_id,'rarity',returned_seed.rarity,'traits',returned_seed.traits,
   'source','harvest','parentSeedIds',returned_seed.parent_seed_ids,'generation',returned_seed.generation,
   'hybridId',returned_seed.hybrid_id,'status','inventory','createdAt',returned_seed.created_at,'updatedAt',returned_seed.updated_at
  )));
 end if;
 state:=jsonb_set(
  state,'{hybridDiscoveries}',
  coalesce((
   select jsonb_agg(jsonb_build_object(
    'recipeId',d.recipe_id,'discoveredAt',d.discovered_at,'totalCreated',d.total_created,'highestGeneration',d.highest_generation
   ) order by d.discovered_at)
   from player_hybrid_discoveries d where d.owner_id=me
  ),'[]'),true
 );
 update game_saves set state=harvest_crop_v2.state,save_version=greatest(save_version,5) where user_id=me;
 update player_crops set status='harvested',updated_at=now() where id=pc.id;
 if pc.seed_instance_id is not null then
  update seed_instances set status='consumed',updated_at=now() where id=pc.seed_instance_id;
 end if;
 result:=jsonb_build_object(
  'state',state,'quantity',final_qty,'xp',def.xp_reward,'quality',quality,'giantQuantity',giant,
  'returnedSeed',case when returned_seed.id is null then null else to_jsonb(returned_seed) end,
  'hybridAttempted',mate.id is not null,
  'hybridSeed',case when hybrid_seed.id is null then null else to_jsonb(hybrid_seed) end,
  'hybridChance',chance,
  'pending',(seed_status='pending' or returned_status='pending')
 );
 insert into harvest_logs(owner_id,crop_instance_id,request_id,result)
 values(me,pc.id,p_request_id,result);
 return result;
end $$;

create or replace function public.buy_genetic_seed(p_crop_id text,p_request_id uuid) returns jsonb language plpgsql security definer set search_path=public as $$
declare me uuid:=auth.uid();save_row game_saves%rowtype;def crop_definitions%rowtype;seed seed_instances%rowtype;rarity text;roll numeric:=random();trait_count integer;max_level integer;traits jsonb;cost integer;state jsonb;
begin
 if me is null then
  raise exception 'AUTH_REQUIRED';
 end if;
 select * into seed
 from seed_instances
 where owner_id=me and request_id=p_request_id;
 if seed.id is not null then
  select g.state into state from game_saves g where g.user_id=me;
  return jsonb_build_object('state',state,'seed',to_jsonb(seed));
 end if;
 select * into save_row from game_saves where user_id=me for update;
 if save_row.user_id is null then
  raise exception 'SAVE_NOT_FOUND';
 end if;
 select * into def from crop_definitions where id=p_crop_id and is_active;
 if def.id is null then
  raise exception 'CROP_NOT_FOUND';
 end if;
 cost:=def.seed_price*3;
 if coalesce((save_row.state->'player'->>'gold')::integer,0)<cost then
  raise exception 'NOT_ENOUGH_GOLD';
 end if;
 rarity:=case when roll<.01 then 'legendary' when roll<.06 then 'epic' when roll<.30 then 'rare' else 'uncommon' end;
 trait_count:=case rarity when 'legendary' then 3 when 'epic' then 2+floor(random()*2)::integer when 'rare' then 1+floor(random()*2)::integer else 1 end;
 max_level:=case when rarity in('epic','legendary') then 3 else 2 end;
 select coalesce(jsonb_agg(jsonb_build_object(
  'traitId',picked.id,'level',1+floor(random()*max_level)::integer,'value',0,'discovered',true
 )),'[]')
 into traits
 from (select td.id from trait_definitions td where td.is_active order by random() limit trait_count) as picked;
 insert into seed_instances(owner_id,crop_id,rarity,traits,source,request_id)
 values(me,p_crop_id,rarity,traits,'shop',p_request_id)
 returning * into seed;
 state:=jsonb_set(save_row.state,'{player,gold}',to_jsonb((save_row.state->'player'->>'gold')::integer-cost));
 state:=jsonb_set(state,'{specialSeeds}',coalesce(state->'specialSeeds','[]')||jsonb_build_array(jsonb_build_object(
  'id',seed.id,'cropId',seed.crop_id,'rarity',seed.rarity,'traits',seed.traits,'source','shop',
  'parentSeedIds','[]'::jsonb,'generation',0,'status','inventory','createdAt',seed.created_at,'updatedAt',seed.updated_at
 )));
 state:=jsonb_set(state,'{lastSavedAt}',to_jsonb(now()::text));
 update game_saves set state=buy_genetic_seed.state,save_version=greatest(save_version,5) where user_id=me;
 return jsonb_build_object('state',state,'seed',to_jsonb(seed),'cost',cost);
end $$;

create or replace function public.claim_pending_seed(p_reward_id uuid) returns jsonb language plpgsql security definer set search_path=public as $$
declare me uuid:=auth.uid();reward pending_seed_rewards%rowtype;seed seed_instances%rowtype;save_row game_saves%rowtype;total_items integer;state jsonb;
begin
 if me is null then
  raise exception 'AUTH_REQUIRED';
 end if;
 select * into reward
 from pending_seed_rewards
 where id=p_reward_id and owner_id=me and claimed_at is null
 for update;
 if reward.id is null then
  raise exception 'REWARD_NOT_FOUND';
 end if;
 select * into save_row from game_saves where user_id=me for update;
 select coalesce(sum((item->>'quantity')::integer),0)
 into total_items
 from jsonb_array_elements(coalesce(save_row.state->'inventory','[]')) as inv(item);
 total_items:=total_items+coalesce(jsonb_array_length(save_row.state->'specialSeeds'),0);
 if total_items>=coalesce((save_row.state->'player'->>'inventoryCapacity')::integer,100) then
  raise exception 'INVENTORY_FULL';
 end if;
 select * into seed
 from seed_instances
 where id=reward.seed_instance_id and owner_id=me
 for update;
 if seed.id is null then
  raise exception 'SEED_NOT_FOUND';
 end if;
 update seed_instances set status='inventory',updated_at=now() where id=seed.id;
 update pending_seed_rewards set claimed_at=now() where id=reward.id;
 state:=jsonb_set(save_row.state,'{specialSeeds}',coalesce(save_row.state->'specialSeeds','[]')||jsonb_build_array(jsonb_build_object(
  'id',seed.id,'cropId',seed.crop_id,'rarity',seed.rarity,'traits',seed.traits,'source',seed.source,
  'parentSeedIds',seed.parent_seed_ids,'generation',seed.generation,'hybridId',seed.hybrid_id,
  'status','inventory','createdAt',seed.created_at,'updatedAt',now()
 )));
 state:=jsonb_set(state,'{lastSavedAt}',to_jsonb(now()::text));
 update game_saves set state=claim_pending_seed.state where user_id=me;
 return jsonb_build_object('state',state,'seed',to_jsonb(seed));
end $$;

-- Backfill cây đang trồng cũ; giữ nguyên plantedAt/readyAt, common, không đặc tính, G0.
insert into public.player_crops(owner_id,plot_index,crop_id,rarity,traits,generation,planted_at,ready_at,calculated_growth_seconds,care_data,weather_data,status)
select g.user_id,p.idx,(p.value->'cropInstance'->>'cropId'),'common','[]',0,(p.value->'cropInstance'->>'plantedAt')::timestamptz,(p.value->'cropInstance'->>'readyAt')::timestamptz,greatest(1,coalesce((p.value->'cropInstance'->>'calculatedGrowthDuration')::integer,(p.value->'cropInstance'->>'baseGrowthDuration')::integer)),coalesce(p.value->'cropInstance'->'care','{}'),coalesce(p.value->'cropInstance'->'weatherEffects','{}'),case when (p.value->'cropInstance'->>'readyAt')::timestamptz<=now() then 'ready' else 'growing' end
from game_saves g cross join lateral jsonb_array_elements(g.state->'plots')with ordinality p(value,idx) where p.value->'cropInstance' is not null and exists(select 1 from crop_definitions c where c.id=p.value->'cropInstance'->>'cropId')
on conflict(owner_id,plot_index)where status in('growing','ready','harvesting') do nothing;

revoke all on function public.genetic_trait_value(jsonb,text),public.game_inventory_quantity(jsonb,text,text),public.game_inventory_change(jsonb,text,text,integer),public.plant_crop_v2(integer,text,uuid),public.harvest_crop_v2(integer,uuid),public.buy_genetic_seed(text,uuid),public.claim_pending_seed(uuid) from public,anon;
grant execute on function public.plant_crop_v2(integer,text,uuid),public.harvest_crop_v2(integer,uuid),public.buy_genetic_seed(text,uuid),public.claim_pending_seed(uuid) to authenticated;
