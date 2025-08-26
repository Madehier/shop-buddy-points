-- 1) Policies aufheben (falls vorhanden)
do $$
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
  perform 1 from pg_class where relname='content_blocks' and relnamespace = 'public'::regnamespace;
  if found then
    execute 'alter table public.content_blocks disable row level security';
  end if;
end$$;

-- 3) Tabelle löschen (falls vorhanden)
drop table if exists public.content_blocks cascade;

-- (Optional) zugehöriger Storage-Bucket "content-images" samt Objekten
-- Achtung: nur ausführen, wenn ihr wirklich ALLE Content-Bilder entfernen wollt.
do $$
begin
  if exists (select 1 from storage.buckets where id='content-images') then
    -- Alle Objekte im Bucket "content-images" löschen
    perform storage.empty_bucket('content-images');
    -- Bucket löschen
    perform storage.delete_bucket('content-images');
  end if;
end$$;