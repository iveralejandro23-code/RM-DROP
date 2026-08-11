-- ============================================================
-- RIVER STORE V12.5 — GALERÍA MULTIMEDIA
-- Ejecutar UNA VEZ en Supabase > SQL Editor
-- Antes de usar V12.5, crear manualmente un bucket:
--   Nombre: product-videos
--   Public: ON
--   File size limit: 30 MB
--   Allowed MIME type: video/mp4
-- ============================================================

alter table public.products
  add column if not exists video_url text;

-- Permitir que el administrador autenticado suba videos.
drop policy if exists "river_admin_insert_product_videos" on storage.objects;
create policy "river_admin_insert_product_videos"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'product-videos'
  and public.is_admin()
);

drop policy if exists "river_admin_update_product_videos" on storage.objects;
create policy "river_admin_update_product_videos"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'product-videos'
  and public.is_admin()
)
with check (
  bucket_id = 'product-videos'
  and public.is_admin()
);

drop policy if exists "river_admin_delete_product_videos" on storage.objects;
create policy "river_admin_delete_product_videos"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'product-videos'
  and public.is_admin()
);

-- Lectura/listado del bucket desde clientes.
drop policy if exists "river_public_read_product_videos" on storage.objects;
create policy "river_public_read_product_videos"
on storage.objects
for select
to public
using (bucket_id = 'product-videos');
