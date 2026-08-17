// ROCKSTAR — Order email webhook (producción)
// Requiere secretos de Edge Functions:
// RESEND_API_KEY
// EMAIL_FROM
// ROCKSTAR_ORDER_WEBHOOK_SECRET

import { createClient } from "npm:@supabase/supabase-js@2";

type WebhookPayload = {
  type: "INSERT" | "UPDATE" | "DELETE";
  table: string;
  schema: string;
  record: Record<string, any>;
  old_record?: Record<string, any> | null;
};

const esc = (v: any) =>
  String(v ?? "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  }[c]!));

const money = (v: any) =>
  new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
  }).format(Number(v) || 0);

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
  const EMAIL_FROM = Deno.env.get("EMAIL_FROM");
  const WEBHOOK_SECRET = Deno.env.get("ROCKSTAR_ORDER_WEBHOOK_SECRET");
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");

  const suppliedSecret = req.headers.get("x-rockstar-secret");
  if (!WEBHOOK_SECRET || suppliedSecret !== WEBHOOK_SECRET) {
    return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  let secretKey = "";
  try {
    secretKey = JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") || "{}")["default"] || "";
  } catch (_) {}

  if (!secretKey) {
    secretKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  }

  if (!RESEND_API_KEY || !EMAIL_FROM || !SUPABASE_URL || !secretKey) {
    return Response.json({ error: "Missing server secrets" }, { status: 500 });
  }

  const payload: WebhookPayload = await req.json();
  if (payload.type !== "INSERT" || payload.table !== "orders") {
    return Response.json({ ok: true, skipped: true });
  }

  const order = payload.record;
  const db = createClient(SUPABASE_URL, secretKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  let items: any[] = [];
  let previousCount = -1;
  let stableReads = 0;

  for (let attempt = 0; attempt < 10; attempt++) {
    const { data } = await db
      .from("order_items")
      .select("product_name,qty,unit_price,subtotal")
      .eq("order_id", order.id)
      .order("id");

    items = data || [];
    if (items.length > 0 && items.length === previousCount) stableReads++;
    else stableReads = 0;

    if (stableReads >= 1) break;
    previousCount = items.length;
    await sleep(300);
  }

  const { data: settings } = await db
    .from("store_settings")
    .select("store_name,notification_email,admin_email_notifications,customer_email_notifications,whatsapp")
    .eq("id", 1)
    .maybeSingle();

  const storeName = settings?.store_name || "ROCKSTAR";
  const rows = items.map((i: any) => `
    <tr>
      <td style="padding:8px;border-bottom:1px solid #eee">${esc(i.product_name)}</td>
      <td style="padding:8px;border-bottom:1px solid #eee;text-align:center">${Number(i.qty) || 0}</td>
      <td style="padding:8px;border-bottom:1px solid #eee;text-align:right">${money(i.subtotal)}</td>
    </tr>`).join("");

  const orderBlock = `
    <div style="font-family:Arial,sans-serif;max-width:640px;margin:auto;color:#171717">
      <div style="background:#090b0e;color:#e6bd73;padding:22px 26px">
        <h1 style="margin:0;font-size:24px">${esc(storeName)}</h1>
      </div>
      <div style="padding:26px">
        <h2 style="margin-top:0">Pedido ${esc(order.folio || "")}</h2>
        <p><strong>Cliente:</strong> ${esc(order.customer_name || "")}</p>
        <p><strong>Teléfono:</strong> ${esc(order.customer_phone || "")}</p>
        ${order.customer_email ? `<p><strong>Correo:</strong> ${esc(order.customer_email)}</p>` : ""}
        <p><strong>Entrega:</strong> ${esc(order.delivery_type || "")}</p>
        ${order.delivery_address ? `<p><strong>Dirección:</strong> ${esc(order.delivery_address)} ${esc(order.delivery_city || "")} ${esc(order.delivery_zip || "")}</p>` : ""}
        <p><strong>Pago:</strong> ${esc(order.payment || "")}</p>
        <table style="width:100%;border-collapse:collapse;margin:20px 0">
          <thead><tr><th style="padding:8px;text-align:left">Producto</th><th>Cant.</th><th style="text-align:right">Subtotal</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
        <p style="font-size:20px"><strong>Total: ${money(order.total)}</strong></p>
        ${order.notes ? `<p><strong>Notas:</strong> ${esc(order.notes)}</p>` : ""}
      </div>
    </div>`;

  async function send(to: string, subject: string, html: string, key: string) {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Idempotency-Key": key,
      },
      body: JSON.stringify({ from: EMAIL_FROM, to: [to], subject, html }),
    });

    const body = await response.json().catch(() => ({}));
    return { ok: response.ok, status: response.status, body };
  }

  const results: any = {};

  if (settings?.admin_email_notifications !== false && settings?.notification_email) {
    results.admin = await send(
      settings.notification_email,
      `🛍️ Nuevo pedido ${order.folio || ""} · ${storeName}`,
      `<p style="font-family:Arial,sans-serif"><strong>Acaba de entrar un pedido nuevo.</strong></p>${orderBlock}`,
      `rockstar-${order.id}-admin`,
    );
  }

  if (settings?.customer_email_notifications !== false && order.customer_email) {
    results.customer = await send(
      order.customer_email,
      `Confirmación de pedido ${order.folio || ""} · ${storeName}`,
      `<div style="font-family:Arial,sans-serif;max-width:640px;margin:auto">
        <p>Hola ${esc(order.customer_name || "")},</p>
        <p>Recibimos tu pedido correctamente. Conserva este correo y tu folio <strong>${esc(order.folio || "")}</strong>.</p>
        ${orderBlock}
        <p>La tienda se pondrá en contacto contigo para continuar con la entrega y el pago cuando corresponda.</p>
      </div>`,
      `rockstar-${order.id}-customer`,
    );
  }

  return Response.json({ ok: true, items_found: items.length, results });
});
