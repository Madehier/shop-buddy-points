-- Fix security warnings - corrected syntax

-- Drop the security definer view and recreate as normal view
drop view if exists public.pickup_queue_view;

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

-- Admin policy for pickup_queue_view access
drop policy if exists "Admins can view pickup queue" on public.claims;
create policy "Admins can view pickup queue" on public.claims
for select using (
  exists (
    select 1 from public.profiles p 
    where p.id = auth.uid() and p.is_admin = true
  )
);

drop policy if exists "Admins can view orders for pickup" on public.orders;
create policy "Admins can view orders for pickup" on public.orders  
for select using (
  exists (
    select 1 from public.profiles p 
    where p.id = auth.uid() and p.is_admin = true
  )
);

-- Fix function search paths - update functions to have stable search_path
create or replace function public.update_updated_at_column()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

create or replace function public.trigger_check_badges()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
BEGIN
  -- Check badges for the customer
  PERFORM public.check_and_award_badges(NEW.customer_id);
  RETURN NEW;
END;
$$;