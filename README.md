# ROCKSTAR STORE — ENTREGA FINAL

Paquete consolidado para operación de la tienda.

## Inicio
- Tienda pública: `index.html`
- Administración: `login.html` / `admin.html`
- Manual de uso: disponible dentro de Admin → **Manual de uso**

## Supabase
La carpeta `supabase/` conserva únicamente:
- `PRODUCCION_ACTUAL.sql`: referencia consolidada de la lógica SQL actual.
- `config.toml`: configuración del proyecto local.
- `functions/order-email/index.ts`: código actual de la función de correo.

No ejecutar `PRODUCCION_ACTUAL.sql` sobre una base en producción salvo que se esté restaurando o configurando una instalación y se conozca el procedimiento.

## Importante
No publicar claves privadas, secretos de Resend ni credenciales administrativas dentro de estos archivos. Las credenciales privadas deben permanecer en Supabase/Resend.
