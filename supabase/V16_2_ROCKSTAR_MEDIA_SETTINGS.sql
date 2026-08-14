-- ROCKSTAR STORE V16.2 — FONDO Y MÚSICA DESDE ADMIN
-- Ejecutar UNA VEZ en Supabase > SQL Editor.

alter table public.store_settings
  add column if not exists background_url text,
  add column if not exists background_type text,
  add column if not exists background_enabled boolean not null default true,
  add column if not exists music_url text,
  add column if not exists music_enabled boolean not null default true;

-- Reutilizamos el bucket existente de branding, ampliándolo para imagen/video/audio.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'store-branding',
  'store-branding',
  true,
  52428800,
  array[
    'image/jpeg','image/png','image/webp',
    'video/mp4','video/webm',
    'audio/mpeg','audio/mp3','audio/wav','audio/x-wav','audio/mp4'
  ]
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "river_public_read_store_branding" on storage.objects;
create policy "river_public_read_store_branding"
on storage.objects for select
to public
using (bucket_id = 'store-branding');

drop policy if exists "river_admin_insert_store_branding" on storage.objects;
create policy "river_admin_insert_store_branding"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'store-branding'
  and public.is_admin()
);

drop policy if exists "river_admin_update_store_branding" on storage.objects;
create policy "river_admin_update_store_branding"
on storage.objects for update
to authenticated
using (
  bucket_id = 'store-branding'
  and public.is_admin()
)
with check (
  bucket_id = 'store-branding'
  and public.is_admin()
);

drop policy if exists "river_admin_delete_store_branding" on storage.objects;
create policy "river_admin_delete_store_branding"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'store-branding'
  and public.is_admin()
);
