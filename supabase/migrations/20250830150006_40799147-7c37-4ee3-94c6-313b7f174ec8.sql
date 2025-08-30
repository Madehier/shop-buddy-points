-- 1) Tabellen-Anpassung: flexible Produktdaten
create extension if not exists pgcrypto;

-- Basistabelle existiert bereits; fehlende Spalten nachziehen
alter table if exists public.preorder_products
  add column if not exists description text,
  add column if not exists price_cents integer check (price_cents >= 0),
  add column if not exists avg_lead_time_minutes integer check (avg_lead_time_minutes >= 0),
  add column if not exists photo_url text;

-- Einheit/Step sicherstellen (falls ältere Seeds)
alter table if exists public.preorder_products
  alter column unit type text,
  alter column step_int set not null;

-- 2) RLS bleibt aktiv; Lese-Policy existiert bereits.
-- Schreibrechte NUR für Admins ergänzen (idempotent)
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='preorder_products' and policyname='preorder_products_admin_all'
  ) then
    create policy preorder_products_admin_all on public.preorder_products
      for all
      using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin))
      with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin));
  end if;
end$$;

-- 3) (Optional) Storage-Bucket für Produktbilder
insert into storage.buckets (id, name, public)
values ('preorders', 'preorders', true)
on conflict (id) do nothing;

do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='Preorders public read'
  ) then
    create policy "Preorders public read"
      on storage.objects for select
      using (bucket_id = 'preorders');
  end if;

  if not exists (
    select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='Preorders auth upload'
  ) then
    create policy "Preorders auth upload"
      on storage.objects for insert to authenticated
      with check (bucket_id = 'preorders');
  end if;
end$$;