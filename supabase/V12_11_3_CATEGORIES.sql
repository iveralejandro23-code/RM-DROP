-- ============================================================
-- RIVER STORE V12.11.3 — CATEGORÍAS COMPARTIDAS EN SUPABASE
-- EJECUTAR UNA SOLA VEZ EN: Supabase > SQL Editor
-- ============================================================

alter table public.products
  add column if not exists category_id bigint;

create table if not exists public.categories (
  id bigint primary key,
  name text not null,
  type text not null default 'category'
    check (type in ('category','collection')),
  active boolean not null default true,
  description text default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.categories enable row level security;

drop policy if exists "river_public_read_categories" on public.categories;
create policy "river_public_read_categories"
on public.categories
for select
to public
using (active = true);

drop policy if exists "river_admin_read_categories" on public.categories;
create policy "river_admin_read_categories"
on public.categories
for select
to authenticated
using (public.is_admin());

drop policy if exists "river_admin_insert_categories" on public.categories;
create policy "river_admin_insert_categories"
on public.categories
for insert
to authenticated
with check (public.is_admin());

drop policy if exists "river_admin_update_categories" on public.categories;
create policy "river_admin_update_categories"
on public.categories
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "river_admin_delete_categories" on public.categories;
create policy "river_admin_delete_categories"
on public.categories
for delete
to authenticated
using (public.is_admin());

-- Productos ya tienen sus políticas existentes.
-- category_id queda como dato opcional del producto.
