-- ROCKSTAR STORE — LÓGICA ACTUAL DE PRODUCCIÓN
-- Respaldo técnico de funciones que se ajustaron después de las migraciones iniciales.
-- NO contiene secretos. El secreto esperado en Vault se llama:
-- rockstar_order_webhook_secret

create extension if not exists pg_net with schema extensions;

create or replace function public.create_store_order(
  p_customer jsonb,
  p_delivery jsonb,
  p_payment text,
  p_notes text,
  p_items jsonb
)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_order_id uuid;
  v_folio text;
  v_total numeric(12,2) := 0;
  v_item jsonb;
  v_product public.products%rowtype;
  v_qty integer;
  v_effective_price numeric(12,2);
begin
  if coalesce(trim(p_customer->>'name'),'') = '' then raise exception 'Nombre requerido'; end if;
  if coalesce(trim(p_customer->>'phone'),'') = '' then raise exception 'Teléfono requerido'; end if;
  if jsonb_array_length(coalesce(p_items,'[]'::jsonb)) = 0 then raise exception 'El carrito está vacío'; end if;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_qty := (v_item->>'qty')::integer;
    select * into v_product from public.products
      where id = (v_item->>'product_id')::bigint and active = true;
    if not found then raise exception 'Producto no disponible'; end if;
    if v_qty <= 0 then raise exception 'Cantidad inválida'; end if;
    if v_qty > v_product.stock then raise exception 'Stock insuficiente para %', v_product.name; end if;

    v_effective_price := v_product.price;
    if coalesce(v_product.promo_active,false) = true
      and (v_product.promo_start is null or now() >= v_product.promo_start)
      and (v_product.promo_end is null or now() <= v_product.promo_end)
    then
      if v_product.promo_type = 'price'
        and v_product.promo_price is not null
        and v_product.promo_price >= 0
        and v_product.promo_price < v_product.price
      then
        v_effective_price := v_product.promo_price;
      elsif v_product.promo_type = 'percent'
        and v_product.promo_percent is not null
        and v_product.promo_percent > 0
        and v_product.promo_percent < 100
      then
        v_effective_price := round(v_product.price * (1 - (v_product.promo_percent / 100.0)),2);
      end if;
    end if;
    v_total := v_total + (v_effective_price * v_qty);
  end loop;

  insert into public.orders(
    customer_name, customer_phone, customer_email,
    delivery_type, delivery_address, delivery_city, delivery_zip,
    payment, notes, total
  ) values(
    trim(p_customer->>'name'), trim(p_customer->>'phone'), nullif(trim(p_customer->>'email'),''),
    coalesce(p_delivery->>'type','Entrega local'), nullif(trim(p_delivery->>'address'),''),
    nullif(trim(p_delivery->>'city'),''), nullif(trim(p_delivery->>'zip'),''),
    p_payment, nullif(trim(p_notes),''), v_total
  ) returning id, folio into v_order_id, v_folio;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_qty := (v_item->>'qty')::integer;
    select * into v_product from public.products where id = (v_item->>'product_id')::bigint;
    v_effective_price := v_product.price;
    if coalesce(v_product.promo_active,false) = true
      and (v_product.promo_start is null or now() >= v_product.promo_start)
      and (v_product.promo_end is null or now() <= v_product.promo_end)
    then
      if v_product.promo_type = 'price'
        and v_product.promo_price is not null
        and v_product.promo_price >= 0
        and v_product.promo_price < v_product.price
      then
        v_effective_price := v_product.promo_price;
      elsif v_product.promo_type = 'percent'
        and v_product.promo_percent is not null
        and v_product.promo_percent > 0
        and v_product.promo_percent < 100
      then
        v_effective_price := round(v_product.price * (1 - (v_product.promo_percent / 100.0)),2);
      end if;
    end if;

    insert into public.order_items(order_id,product_id,product_name,qty,unit_price,subtotal)
    values(v_order_id,v_product.id,v_product.name,v_qty,v_effective_price,v_effective_price*v_qty);
  end loop;

  return jsonb_build_object('id',v_order_id,'folio',v_folio,'total',v_total);
end;
$function$;

create or replace function public.rockstar_send_order_email()
returns trigger
language plpgsql
security definer
set search_path = public, extensions, vault
as $$
declare
  v_secret text;
  v_request_id bigint;
begin
  select decrypted_secret into v_secret
  from vault.decrypted_secrets
  where name = 'rockstar_order_webhook_secret'
  limit 1;

  if v_secret is null or v_secret = '' then
    raise exception 'ROCKSTAR webhook secret not found in Vault';
  end if;

  select net.http_post(
    url := 'https://uaqagdfxpaxsbfjtkcds.supabase.co/functions/v1/order-email',
    body := jsonb_build_object(
      'type','INSERT','table','orders','schema','public','record',to_jsonb(new),'old_record',null
    ),
    headers := jsonb_build_object(
      'Content-Type','application/json','x-rockstar-secret',v_secret
    ),
    timeout_milliseconds := 5000
  ) into v_request_id;

  return new;
end;
$$;

drop trigger if exists rockstar_order_email_trigger on public.orders;
create trigger rockstar_order_email_trigger
after insert on public.orders
for each row execute function public.rockstar_send_order_email();
