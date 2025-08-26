-- 1) Policies aufheben (falls vorhanden)
do $$
declare
  r record;
begin
  if exists (select 1 from pg_policies where schemaname='public' and tablename='content_blocks') then
    -- Alle Policies auf content_blocks löschen
    for r in (select policyname from pg_policies where schemaname='public' and tablename='content_blocks')
    loop
      execute format('drop policy if exists %I on public.content_blocks', r.policyname);
    end loop;
  end if;
exception when undefined_table then
  -- Tabelle gibt's nicht -> egal
  null;
end$$;

-- 2) RLS ggf. deaktivieren (falls Tabelle existiert)
do $$
begin
  if exists (select 1 from pg_class where relname='content_blocks' and relnamespace = 'public'::regnamespace) then
    execute 'alter table public.content_blocks disable row level security';
  end if;
end$$;

-- 3) Tabelle löschen (falls vorhanden)
drop table if exists public.content_blocks cascade;

-- 4) Storage-Bucket "content-images" samt Objekten löschen
do $$
begin
  if exists (select 1 from storage.buckets where id='content-images') then
    -- Alle Objekte im Bucket "content-images" löschen
    delete from storage.objects where bucket_id = 'content-images';
    -- Bucket löschen
    delete from storage.buckets where id = 'content-images';
  end if;
end$$;