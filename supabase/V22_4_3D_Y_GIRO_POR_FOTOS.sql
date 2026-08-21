-- ROCKSTAR V22.4 — guarda solo los modos visuales de portada.
-- Seguro para ejecutar aunque las columnas ya existan.
alter table public.store_settings add column if not exists brand_3d_level text default 'off';
alter table public.store_settings add column if not exists entry_product_3d_level text default 'off';
alter table public.store_settings add column if not exists entry_caption_3d_level text default 'off';

update public.store_settings
set brand_3d_level=coalesce(brand_3d_level,'off'),
    entry_product_3d_level=coalesce(entry_product_3d_level,'off'),
    entry_caption_3d_level=coalesce(entry_caption_3d_level,'off')
where id=1;
