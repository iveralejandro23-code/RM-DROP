-- ROCKSTAR STORE V19.6 — PORTADA EDITABLE + FRASE GRÁFICA VERIFICADA
-- Ejecutar UNA sola vez en Supabase > SQL Editor.

alter table public.store_settings
  add column if not exists header_brand_mode text default 'text',
  add column if not exists header_brand_text text default 'ROCKSTAR',
  add column if not exists header_brand_image_url text default '',
  add column if not exists brand_glow_color text default '#e5bd70',
  add column if not exists entry_product_glow_color text default '#e5bd70',
  add column if not exists entry_product_image_url text default '',
  add column if not exists entry_caption_background_color text default '#000000',
  add column if not exists entry_caption_glow_color text default '#ff2028',
  add column if not exists entry_caption_background_enabled boolean not null default true,
  add column if not exists entry_background_url text default '',
  add column if not exists entry_caption_text text default 'DESDE LA TÍA HASTA DONDE TOPE',
  add column if not exists entry_caption_image_url text default '',
  add column if not exists entry_caption_mode text default 'image',
  add column if not exists entry_product_id bigint;

update public.store_settings
set
  header_brand_text=coalesce(nullif(header_brand_text,''),nullif(store_name,''),'ROCKSTAR'),
  brand_glow_color=coalesce(nullif(brand_glow_color,''),'#e5bd70'),
  entry_product_glow_color=coalesce(nullif(entry_product_glow_color,''),'#e5bd70'),
  entry_caption_background_color=coalesce(nullif(entry_caption_background_color,''),'#000000'),
  entry_caption_text=coalesce(nullif(entry_caption_text,''),'DESDE LA TÍA HASTA DONDE TOPE')
where id=1;
