-- ROCKSTAR V22 — Web Push
-- Ejecutar una sola vez en Supabase > SQL Editor.

alter table public.store_settings
  add column if not exists push_vapid_public_key text;

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);

alter table public.push_subscriptions enable row level security;

drop policy if exists "admins_manage_push_subscriptions" on public.push_subscriptions;
create policy "admins_manage_push_subscriptions"
on public.push_subscriptions
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create or replace function public.rockstar_send_order_push()
returns trigger
language plpgsql
security definer
set search_path = public, extensions, vault
as $$
declare
  v_secret text;
  v_request_id bigint;
begin
  select decrypted_secret
    into v_secret
  from vault.decrypted_secrets
  where name = 'rockstar_order_webhook_secret'
  limit 1;

  if v_secret is null or v_secret = '' then
    raise exception 'ROCKSTAR webhook secret not found in Vault';
  end if;

  select net.http_post(
    url := 'https://uaqagdfxpaxsbfjtkcds.supabase.co/functions/v1/order-push',
    body := jsonb_build_object(
      'type','INSERT',
      'table','orders',
      'schema','public',
      'record',to_jsonb(new)
    ),
    headers := jsonb_build_object(
      'Content-Type','application/json',
      'x-rockstar-secret',v_secret
    ),
    timeout_milliseconds := 5000
  ) into v_request_id;

  return new;
end;
$$;

drop trigger if exists rockstar_order_push_trigger on public.orders;
create trigger rockstar_order_push_trigger
after insert on public.orders
for each row
execute function public.rockstar_send_order_push();
