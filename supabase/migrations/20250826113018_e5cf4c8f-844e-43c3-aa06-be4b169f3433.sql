-- Vereinheitlichte Abhol-Queue: Rewards (claims) + Angebote (orders)
create or replace view public.pickup_queue_view as
select
  'reward'::text              as item_type,
  cl.id                       as item_id,
  cl.customer_id              as user_id,
  cl.qr_code                  as pickup_code,         -- schon vorhanden
  cl.reward_name              as title,
  1                           as qty,
  cl.points_redeemed          as points,              -- nur für Anzeige
  cl.status                   as status,              -- 'EINGELÖST' | 'ABGEHOLT'
  cl.created_at               as created_at,
  coalesce(c.name,'Kunde')    as customer_name,
  coalesce(c.email,'')        as customer_email
from public.claims cl
left join public.customers c on c.id = cl.customer_id

union all

select
  'offer'::text               as item_type,
  o.id                        as item_id,
  o.user_id                   as user_id,
  ('order_'||o.id::text)      as pickup_code,         -- generierter Code für Angebote
  ofr.title                   as title,
  o.qty                       as qty,
  null::int                   as points,
  o.status                    as status,              -- 'reserved' | 'picked_up' | 'cancelled'
  o.created_at                as created_at,
  coalesce(c2.name,'Kunde')   as customer_name,
  coalesce(c2.email,'')       as customer_email
from public.orders o
join public.offers ofr on ofr.id = o.offer_id
left join public.customers c2 on c2.id = o.user_id;

-- Einmaliger QR/Code-Scan: erkennt Reward-QR (claims.qr_code)
-- oder Angebots-QR (Prefix 'order_' + orders.id) und markiert als abgeholt.
create or replace function public.admin_pickup_by_code(p_code text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare v_order_id uuid;
declare v_claim_id uuid;
declare v_status text;
begin
  -- Versuche Order-Code: 'order_<uuid>'
  if position('order_' in p_code) = 1 then
    v_order_id := substring(p_code from 7)::uuid;

    -- nur reservierte Bestellungen „abholen"
    select status into v_status from public.orders where id = v_order_id for update;
    if not found then
      raise exception 'order not found';
    end if;
    if v_status = 'picked_up' then
      return; -- idempotent
    end if;
    if v_status = 'cancelled' then
      raise exception 'cannot pickup a cancelled order';
    end if;

    update public.orders set status = 'picked_up' where id = v_order_id;
    return;
  end if;

  -- sonst: Reward-QR (claim)
  select id, status into v_claim_id, v_status
  from public.claims
  where qr_code = p_code
  for update;

  if not found then
    raise exception 'code not recognized';
  end if;

  -- Nur „EINGELÖST" → „ABGEHOLT"
  if v_status = 'ABGEHOLT' then
    return; -- idempotent
  end if;

  update public.claims set status = 'ABGEHOLT', updated_at = now()
  where id = v_claim_id;
end $$;