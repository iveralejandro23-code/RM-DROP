-- ROCKSTAR V17.7 — POLÍTICAS EDITABLES DESDE ADMIN
-- Ejecutar UNA sola vez en Supabase > SQL Editor.
-- No borra ni modifica productos, pedidos, inventario ni configuración existente.

alter table public.store_settings
  add column if not exists shipping_policy text default '',
  add column if not exists returns_policy text default '',
  add column if not exists privacy_policy text default '',
  add column if not exists terms_policy text default '';

-- Valores iniciales vacíos: mientras no se editen desde Admin,
-- las páginas públicas conservan el texto actual incluido en la tienda.
