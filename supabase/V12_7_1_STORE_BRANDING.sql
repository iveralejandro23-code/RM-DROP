-- RIVER STORE V12.7.1 — BRANDING / LOGO / PORTADA
-- Ejecutar una sola vez en Supabase > SQL Editor.
-- Antes, crea en Supabase Storage un bucket público llamado:
--   store-branding
-- Recomendado: 5 MB, image/jpeg,image/png,image/webp

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
