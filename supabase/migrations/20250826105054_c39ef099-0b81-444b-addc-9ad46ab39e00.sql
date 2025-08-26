-- Fix security warnings: Add search_path to functions

-- Update offers_check_sold function
create or replace function public.offers_check_sold()
returns trigger 
language plpgsql 
security definer
set search_path = public
as $$
begin
  if NEW.sold_count > NEW.limit_total then
    raise exception 'sold_count exceeds limit_total';
  end if;
  return NEW;
end $$;

-- Update admin_mark_picked_up function  
create or replace function public.admin_mark_picked_up(p_order_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.orders
     set status = 'picked_up'
   where id = p_order_id;
end$$;

-- Update admin_cancel_order function
create or replace function public.admin_cancel_order(p_order_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare v_offer_id uuid;
declare v_qty int;
begin
  -- Hole Daten
  select offer_id, qty
    into v_offer_id, v_qty
  from public.orders
  where id = p_order_id;

  if v_offer_id is null then
    raise exception 'Order not found';
  end if;

  -- Status ändern
  update public.orders
     set status = 'cancelled'
   where id = p_order_id;

  -- Counter zurücksetzen
  update public.offers
     set sold_count = greatest(sold_count - v_qty, 0)
   where id = v_offer_id;
end$$;