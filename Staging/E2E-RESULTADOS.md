# Resultados E2E de JI Express Staging

## CRUD E2E real en Supabase (16 de octubre de 2026)

- **Entorno:** panel local `http://localhost:5500/JI%20Express/Admin/admin.html?supabase=staging`, conectado al proyecto aislado `ofxwstrxvaangrqbgajb`. El proyecto estaba Healthy y `public.envios` comenzó con cero filas.
- **Acceso admin:** se asignó `app_metadata.role = admin` únicamente a la cuenta de prueba de staging. Una consulta de verificación devolvió ese rol para el UUID esperado. Producción no se modificó.
- **Alta y edición:** aprobadas. Se creó `E2E-STAGING-20261016-001` con datos sintéticos; luego se actualizaron el nombre y la dirección y ambos cambios aparecieron en la tabla.
- **Importación:** aprobada con [`e2e-import-test.csv`](e2e-import-test.csv): se importaron `E2E-TEST-001` y `E2E-TEST-002` con los estados esperados (`En sucursal` y `En camino`). Se omitió la fila 4 sin tracking code y el registro de errores mostró el motivo esperado.
- **Búsqueda:** aprobada. `E2E-TEST-001` filtró una sola fila; al limpiar la búsqueda reaparecieron las tres filas de prueba.
- **RLS anónimo:** aprobada para denegar lectura. Una consulta del cliente anónimo a `public.envios` falló con PostgreSQL `42501` (`permission denied for table envios`); no devolvió datos.
- **RLS autenticado no-admin:** aprobada. Una cuenta sintética sin rol admin recibió PostgreSQL `42501` al intentar insertar en `public.envios`; no se creó ningún envío.
- **Limpieza:** se borraron individualmente los tres envíos E2E. También se eliminó la cuenta Auth sintética no-admin con una condición limitada a su UUID y correo de prueba; la consulta posterior confirmó cero coincidencias. La cuenta admin se conservó y `public.envios` volvió a cero filas.
- **Limitaciones:** no se rastreó un envío existente de staging. La RPC pública respondió `null` sin error para un código ficticio inexistente; Edge Functions y notificaciones no se probaron en staging.

## Verificación de conectividad (16 de octubre de 2026)

- **Aplicación local:** el servidor respondió `200` para las páginas pública y Admin, sus CSS y JavaScript, el manifiesto, el service worker y los cinco archivos de esta carpeta. Los dos clientes seleccionaron producción por defecto, staging solo en localhost y bloquearon staging en el host publicado.
- **Supabase Auth:** el endpoint de salud de Auth respondió `200` en staging.
- **RLS anónimo:** `public.envios` respondió `401` con PostgreSQL `42501` (`permission denied for table envios`). La petición no devolvió filas; la denegación coincide con el aislamiento esperado.
- **Rastreo público:** `consultar_envio` respondió `200` con `null` para un código ficticio inexistente. Esta llamada incrementó una vez el contador antiabuso de staging; no modificó envíos.
- **Push en staging:** `notificaciones_push`, `manage-push-subscription` y `send-push-update` no están disponibles en este proyecto (`404`). Las notificaciones push no funcionan ni se consideran verificadas en staging hasta desplegar y configurar esos componentes.
- **Acceso autenticado:** en esta pasada no se repitió el inicio de sesión ni las operaciones administrativas; el navegador integrado no permitió inspeccionar la sesión. El CRUD y las pruebas RLS autenticadas aprobadas anteriormente permanecen documentadas arriba, pero no se revalidaron en esta pasada.

## Realtime de métricas (23 de octubre de 2026)

- **Entorno:** SQL Editor del proyecto JI Express Staging (`ofxwstrxvaangrqbgajb`), branch `main`.
- **Cambio:** se agregó `public.envios` a la publicación `supabase_realtime` con una operación condicional. No se modificaron filas de envíos.
- **Verificación:** la consulta a `pg_catalog.pg_publication_tables` devolvió una fila para `public.envios`.
- **Registro:** aplicado manualmente desde SQL Editor. La migración idempotente equivalente está en `supabase/migrations/20261023190000_enable_envios_realtime.sql`; la ejecución manual no escribe el historial de migraciones de Supabase.