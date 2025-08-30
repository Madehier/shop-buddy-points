-- Voraussetzungen
create extension if not exists pgcrypto;

-- 1. Stammdaten: Produkte für Vorbestellungen
create table if not exists public.preorder_products (
  id uuid primary key default gen_random_uuid(),
  name text not null,                    -- z.B. "Rinderfilet", "Leberkäse"
  unit text not null check (unit in ('per_100g','per_portion')),
  step_int integer not null default 1,   -- per_100g => 100, per_portion => 1
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- 2. Vorbestellung (Header)
create table if not exists public.preorders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,                                   -- = auth.uid()
  status text not null default 'requested'                 -- requested | confirmed | ready | picked_up | cancelled
    check (status in ('requested','confirmed','ready','picked_up','cancelled')),
  desired_pickup_at timestamptz,                           -- Wunschzeit
  confirmed_pickup_at timestamptz,                         -- durch Admin bestätigt
  ready_at timestamptz,                                    -- Ware eingetroffen / bereit
  picked_up_at timestamptz,                                -- abgeholt
  created_at timestamptz not null default now()
);

-- 3. Vorbestellpositionen (Items)
create table if not exists public.preorder_items (
  id uuid primary key default gen_random_uuid(),
  preorder_id uuid not null references public.preorders(id) on delete cascade,
  product_id uuid not null references public.preorder_products(id),
  qty_int integer not null check (qty_int > 0),            -- Menge (Gramm/100g-Schritte bzw. Portionen)
  product_name_cache text not null                         -- Cache für Anzeige
);

-- Indizes
create index if not exists idx_preorders_user on public.preorders(user_id, created_at desc);
create index if not exists idx_preorder_items_preorder on public.preorder_items(preorder_id);

-- RLS anschalten
alter table public.preorder_products enable row level security;
alter table public.preorders enable row level security;
alter table public.preorder_items enable row level security;

-- Policies
do $$
begin
  -- Produkte: jeder darf lesen
  if not exists (select 1 from pg_policies where tablename='preorder_products' and policyname='preorder_products_read') then
    create policy preorder_products_read on public.preorder_products for select using (true);
  end if;

  -- Preorders: User sieht eigene / Admin alles
  if not exists (select 1 from pg_policies where tablename='preorders' and policyname='preorders_user_read') then
    create policy preorders_user_read on public.preorders for select using (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where tablename='preorders' and policyname='preorders_user_insert') then
    create policy preorders_user_insert on public.preorders for insert with check (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where tablename='preorders' and policyname='preorders_user_update_self') then
    create policy preorders_user_update_self on public.preorders for update using (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where tablename='preorders' and policyname='preorders_admin_all') then
    create policy preorders_admin_all on public.preorders for all
      using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin))
      with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin));
  end if;

  -- Items: lesen nur zugehöriger User oder Admin; schreiben nur über RPC
  if not exists (select 1 from pg_policies where tablename='preorder_items' and policyname='preorder_items_user_read') then
    create policy preorder_items_user_read on public.preorder_items for select
      using (exists (select 1 from public.preorders pr where pr.id = preorder_id and (pr.user_id = auth.uid()
             or exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin))));
  end if;
end$$;

-- View für die Adminliste (mit Kundendaten)
create or replace view public.preorders_admin_view as
select
  pr.id as preorder_id,
  pr.user_id,
  coalesce(c.name,'Kunde') as customer_name,
  coalesce(c.email,'') as customer_email,
  pr.status,
  pr.desired_pickup_at,
  pr.confirmed_pickup_at,
  pr.ready_at,
  pr.picked_up_at,
  pr.created_at
from public.preorders pr
left join public.customers c on c.id = pr.user_id;

-- RPC: Vorbestellung anlegen (User)
create or replace function public.create_preorder(p_desired timestamptz, p_items jsonb)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare v_preorder_id uuid;
        v_uid uuid := auth.uid();
        v_it jsonb;
        v_prod record;
        v_qty int;
begin
  if v_uid is null then
    raise exception 'unauthenticated';
  end if;

  -- Header
  insert into public.preorders(user_id, desired_pickup_at, status)
  values (v_uid, p_desired, 'requested')
  returning id into v_preorder_id;

  -- Items validieren & einfügen
  -- p_items Format: [{ "product_id": "<uuid>", "qty_int": 300 }, ...]
  for v_it in select * from jsonb_array_elements(p_items)
  loop
    select * into v_prod from public.preorder_products where id = (v_it->>'product_id')::uuid and is_active = true;
    if not found then
      raise exception 'invalid product';
    end if;

    v_qty := (v_it->>'qty_int')::int;
    if v_qty is null or v_qty <= 0 then
      raise exception 'invalid qty';
    end if;

    -- Schrittweite erzwingen
    if v_prod.unit = 'per_100g' and (v_qty % coalesce(v_prod.step_int,100)) <> 0 then
      raise exception 'qty must be multiple of %', coalesce(v_prod.step_int,100);
    end if;

    insert into public.preorder_items(preorder_id, product_id, qty_int, product_name_cache)
    values (v_preorder_id, v_prod.id, v_qty, v_prod.name);
  end loop;

  return v_preorder_id;
end $$;

-- RPCs: Admin-Workflow (confirm/ready/picked_up/cancel)
create or replace function public.admin_confirm_preorder(p_preorder_id uuid, p_confirmed_at timestamptz default now())
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (select 1 from public.profiles where id = auth.uid() and is_admin) then
    raise exception 'forbidden';
  end if;
  update public.preorders
     set status = 'confirmed', confirmed_pickup_at = p_confirmed_at
   where id = p_preorder_id;
end $$;

create or replace function public.admin_mark_ready_preorder(p_preorder_id uuid, p_ready_at timestamptz default now())
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (select 1 from public.profiles where id = auth.uid() and is_admin) then
    raise exception 'forbidden';
  end if;
  update public.preorders
     set status = 'ready', ready_at = p_ready_at
   where id = p_preorder_id;
end $$;

create or replace function public.admin_mark_picked_up_preorder(p_preorder_id uuid, p_when timestamptz default now())
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (select 1 from public.profiles where id = auth.uid() and is_admin) then
    raise exception 'forbidden';
  end if;
  update public.preorders
     set status = 'picked_up', picked_up_at = p_when
   where id = p_preorder_id;
end $$;

create or replace function public.admin_cancel_preorder(p_preorder_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (select 1 from public.profiles where id = auth.uid() and is_admin) then
    raise exception 'forbidden';
  end if;
  update public.preorders
     set status = 'cancelled'
   where id = p_preorder_id;
end $$;

-- Seed: zwei Produkte anlegen (idempotent)
insert into public.preorder_products(name, unit, step_int, is_active)
select 'Rinderfilet','per_100g',100,true
where not exists (select 1 from public.preorder_products where name='Rinderfilet');

insert into public.preorder_products(name, unit, step_int, is_active)
select 'Leberkäse','per_portion',1,true
where not exists (select 1 from public.preorder_products where name='Leberkäse');