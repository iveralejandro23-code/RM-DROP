-- RIVER STORE V12.7 — CONFIGURACIÓN DE TIENDA
-- Ejecutar una sola vez en Supabase > SQL Editor.

create table if not exists public.store_settings (
  id bigint primary key default 1 check (id = 1),
  store_name text not null default 'RIVER Store',
  owner_name text default '',
  tagline text default '',
  whatsapp text default '',
  email text default '',
  address text default '',
  city text default '',
  currency text not null default 'MXN',
  instagram text default '',
  facebook text default '',
  tiktok text default '',
  youtube text default '',
  logo_url text default '',
  cover_url text default '',
  pickup_enabled boolean not null default true,
  shipping_enabled boolean not null default true,
  payment_transfer boolean not null default true,
  payment_cash boolean not null default true,
  footer_text text default '',
  updated_at timestamptz not null default now()
);

alter table public.store_settings enable row level security;

insert into public.store_settings (id, store_name, owner_name, tagline, currency)
values (1, 'Julián Reynoso Store', 'Julián Reynoso', 'Colección oficial', 'MXN')
on conflict (id) do nothing;

drop policy if exists "river_public_read_store_settings" on public.store_settings;
create policy "river_public_read_store_settings"
on public.store_settings for select
to public
using (id = 1);

drop policy if exists "river_admin_update_store_settings" on public.store_settings;
create policy "river_admin_update_store_settings"
on public.store_settings for update
to authenticated
using (id = 1 and public.is_admin())
with check (id = 1 and public.is_admin());

drop policy if exists "river_admin_insert_store_settings" on public.store_settings;
create policy "river_admin_insert_store_settings"
on public.store_settings for insert
to authenticated
with check (id = 1 and public.is_admin());
