RIVER STORE V12.11.3 — CATEGORÍAS EN SUPABASE

IMPORTANTE:
Antes de abrir esta versión ejecuta:
supabase/V12_11_3_CATEGORIES.sql
en Supabase > SQL Editor.

POR QUÉ:
La versión anterior guardaba la categoría solo localmente.
Después Supabase recargaba los productos sin categoryId y la tienda
pública ya no sabía que “Desde La Tía Hasta Donde Tope” pertenecía a “El Gorron”.

AHORA:
- categories se guarda en Supabase.
- products.category_id se guarda en Supabase.
- Admin y tienda leen la misma clasificación.
- Funciona entre computadoras y prepara el sistema para celular.
- Las categorías existentes locales se migran automáticamente a Supabase.
- La categoría de un producto ya asignada localmente se preserva y sube.

PRUEBA:
1. Ejecuta el SQL.
2. Abre admin.html.
3. Espera 2 segundos.
4. Comprueba que El Gorron siga con 1 producto.
5. Ver tienda.
6. Debe aparecer:
   Explorar colección
   Todos | El Gorron
7. Pulsa El Gorron.
8. Debe quedar solo “Desde La Tía Hasta Donde Tope”.
