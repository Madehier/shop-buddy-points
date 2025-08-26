-- Voraussetzungen
create extension if not exists pgcrypto;
create extension if not exists pg_stat_statements;

-- Basis-Tabellen
create table if not exists public.offers (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  subtitle text,
  description text,
  hero_image_url text,
  price_cents integer not null check (price_cents >= 0),
  pickup_date timestamptz,
  starts_at timestamptz,
  ends_at timestamptz,
  limit_total integer not null check (limit_total >= 0),
  sold_count integer not null default 0 check (sold_count >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  offer_id uuid not null references public.offers(id) on delete cascade,
  user_id uuid not null,
  qty integer not null check (qty > 0),
  status text not null default 'reserved', -- reserved | cancelled | picked_up
  created_at timestamptz not null default now()
);

create table if not exists public.profiles (
  id uuid primary key,          -- = auth.uid()
  is_admin boolean not null default false,
  created_at timestamptz default now()
);

-- RLS einschalten
alter table public.offers enable row level security;
alter table public.orders enable row level security;
alter table public.profiles enable row level security;

-- Policies
do $$
begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='offers' and policyname='offers_read') then
    create policy offers_read on public.offers for select using (true);
  end if;

  if not exists (select 1 from pg_policies where schemaname='public' and tablename='orders' and policyname='orders_read') then
    create policy orders_read on public.orders for select using (auth.uid() = user_id);
  end if;

  if not exists (select 1 from pg_policies where schemaname='public' and tablename='orders' and policyname='orders_insert') then
    create policy orders_insert on public.orders for insert with check (auth.uid() = user_id);
  end if;

  if not exists (select 1 from pg_policies where schemaname='public' and tablename='orders' and policyname='orders_update') then
    create policy orders_update on public.orders for update using (auth.uid() = user_id);
  end if;

  if not exists (select 1 from pg_policies where schemaname='public' and tablename='profiles' and policyname='profiles_self') then
    create policy profiles_self on public.profiles for select using (auth.uid() = id);
  end if;

  if not exists (select 1 from pg_policies where schemaname='public' and tablename='offers' and policyname='offers_admin_write') then
    create policy offers_admin_write on public.offers
    for all
    using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin));
  end if;
end$$;

-- Trigger: sold_count darf Limit nicht überschreiten
create or replace function public.offers_check_sold()
returns trigger language plpgsql as $$
begin
  if NEW.sold_count > NEW.limit_total then
    raise exception 'sold_count exceeds limit_total';
  end if;
  return NEW;
end $$;

drop trigger if exists trg_offers_check_sold on public.offers;
create trigger trg_offers_check_sold
before update on public.offers
for each row execute function public.offers_check_sold();

-- Atomare Kauf/Rerservierungs-Logik
create or replace function public.purchase_offer(p_offer_id uuid, p_qty int default 1)
returns table(order_id uuid, remaining int)
language plpgsql
security definer  -- erlaubt Ausführung trotz RLS, aber siehe WHERE-Klauseln unten
set search_path = public
as $$
declare v_remaining int;
begin
  if p_qty <= 0 then raise exception 'qty must be > 0'; end if;

  -- Angebotszeile sperren
  perform 1 from public.offers where id = p_offer_id for update;

  select (limit_total - sold_count)
    into v_remaining
  from public.offers
  where id = p_offer_id
    and is_active = true
    and (starts_at is null or starts_at <= now())
    and (ends_at   is null or ends_at   >= now());

  if v_remaining is null then
    raise exception 'offer not available';
  end if;

  if v_remaining < p_qty then
    raise exception 'sold out';
  end if;

  update public.offers
     set sold_count = sold_count + p_qty
   where id = p_offer_id;

  insert into public.orders(offer_id, user_id, qty)
  values (p_offer_id, auth.uid(), p_qty)
  returning id into order_id;

  remaining := (select limit_total - sold_count from public.offers where id = p_offer_id);
  return next;
end $$;