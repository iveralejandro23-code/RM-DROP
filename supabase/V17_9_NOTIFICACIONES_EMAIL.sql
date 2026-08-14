-- ============================================================
-- ROCKSTAR STORE V17.9 — NOTIFICACIONES + EMAIL
-- EJECUTAR UNA SOLA VEZ EN SUPABASE > SQL EDITOR
-- No borra productos, pedidos ni inventario.
-- ============================================================

alter table public.store_settings
  add column if not exists notification_email text default '',
  add column if not exists admin_email_notifications boolean not null default true,
  add column if not exists customer_email_notifications boolean not null default true;

-- Habilitar Realtime para pedidos si aún no está agregado.
do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'orders'
  ) then
    alter publication supabase_realtime add table public.orders;
  end if;
end $$;
