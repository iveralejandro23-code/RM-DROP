# ROCKSTAR STORE — V22.4.33

Versión consolidada y limpiada desde V22.4.32.

## Estado actual
- La tienda entra directamente al catálogo; la antigua sección `#inicio` ya no existe.
- La portada usa únicamente la imagen seleccionada desde Admin.
- El header conserva el 3D aprobado de corona + ROCKSTAR.
- ROCKSTAR de la portada espera su imagen transparente antes de iniciar el 3D.
- El sistema antiguo de múltiples fotos fue retirado.
- Se retiraron reglas CSS de `.rockstar-real-hero`, la animación antigua `rockstarBrandWordTurn` y la función muerta `syncFeaturedProduct()`.

## Archivos principales
- `index.html`: tienda pública.
- `login.html` / `admin.html`: administración.
- `rockstar-entry.js`: pantalla de entrada.
- `store-brand-3d.js`: 3D del header y marcas públicas.
- `styles.css`: estilos.

## Documentación especializada conservada
- `LEEME_PANORAVEN_360.txt`
- `PUSH_SETUP/LEEME_ACTIVAR_PUSH.txt`

Esta limpieza no requiere SQL nuevo si la versión anterior ya funcionaba.
