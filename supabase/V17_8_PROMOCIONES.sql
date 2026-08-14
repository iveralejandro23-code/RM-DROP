-- ROCKSTAR V17.8 — PROMOCIONES POR PRODUCTO
-- Ejecutar UNA sola vez. No borra datos.
alter table public.products
 add column if not exists promo_active boolean not null default false,
 add column if not exists promo_type text not null default 'percent',
 add column if not exists promo_percent numeric,
 add column if not exists promo_price numeric,
 add column if not exists promo_label text,
 add column if not exists promo_start timestamptz,
 add column if not exists promo_end timestamptz;
