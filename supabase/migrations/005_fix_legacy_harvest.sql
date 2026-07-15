-- Reconcile player_crops from the authoritative JSON save before adding the v3 bonus.
create or replace function public.harvest_crop_v3(p_plot_index integer,p_request_id uuid) returns jsonb
language plpgsql security definer set search_path=public as $$
declare
 me uuid:=auth.uid();payload jsonb;def crop_definitions%rowtype;bonus integer:=0;
 next_state jsonb;capacity integer;total_items integer;crop_id text;
begin
 if me is null then raise exception 'AUTH_REQUIRED';end if;
 if p_plot_index not between 1 and 24 then raise exception 'PLOT_INVALID';end if;
 select h.result into payload from harvest_logs h where h.owner_id=me and h.request_id=p_request_id;
 if payload is not null then return payload;end if;

 -- v2 validates the JSON plot and repairs missing/stale normalized crop rows.
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

 payload:=jsonb_set(payload,'{state}',next_state);
 payload:=jsonb_set(payload,'{quantity}',to_jsonb(coalesce((payload->>'quantity')::integer,0)+bonus));
 payload:=jsonb_set(payload,'{economyBonusQuantity}',to_jsonb(bonus));
 update game_saves g set state=next_state,save_version=greatest(g.save_version,6) where g.user_id=me;
 update harvest_logs h set result=payload where h.owner_id=me and h.request_id=p_request_id;
 return payload;
end $$;

revoke all on function public.harvest_crop_v3(integer,uuid) from public,anon;
grant execute on function public.harvest_crop_v3(integer,uuid) to authenticated;
