-- ROCKSTAR STORE V17 — REVISIÓN DE SEGURIDAD RLS
-- Este script NO borra datos ni políticas.
-- Activa RLS (si no estaba activo) en las tablas principales
-- y después muestra las políticas existentes para revisión.

alter table if exists public.products enable row level security;
alter table if exists public.orders enable row level security;
alter table if exists public.inventory_movements enable row level security;
alter table if exists public.order_notes enable row level security;
alter table if exists public.store_settings enable row level security;
alter table if exists public.categories enable row level security;

select
  schemaname,
  tablename,
  policyname,
  roles,
  cmd,
  qual,
  with_check
from pg_policies
where schemaname='public'
  and tablename in (
    'products','orders','inventory_movements',
    'order_notes','store_settings','categories'
  )
order by tablename, policyname;

-- IMPORTANTE:
-- Revisa que las operaciones de escritura administrativa requieran autenticación
-- y la función public.is_admin() donde corresponda.
-- No coloques una SERVICE_ROLE_KEY en config.js o cualquier archivo público.
