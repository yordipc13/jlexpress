# Migraciones y operaciones de Supabase

## Estado

La aplicación está conectada al proyecto `swpvtfjbseftynnhflfi` y el dashboard lo reportó como **Healthy** el 15 de octubre de 2026. El DDL que creó `public.envios` no está guardado en este repositorio, así que todavía no se puede reconstruir toda la base desde cero.

El Table Editor confirmó las tablas `Xcargo`, `admin_presence`, `envios`, `notificaciones_envio`, `notificaciones_push`, `notificaciones_solicitudes` y `paquetes_ruta`. El historial de migraciones del dashboard no registra migraciones; esto no significa que la base esté vacía ni confirma si los SQL se aplicaron manualmente. Storage no tiene buckets. La lista de usuarios de Auth no terminó de cargar durante la verificación, por lo que no se confirmaron cuentas ni claims administrativos.

Para documentar y versionar el esquema inicial, obtener el DDL desde el proyecto Supabase con acceso autorizado y compararlo con la base existente antes de crear una migración; no volver a ejecutar una creación de tabla sobre producción sin esa comparación.

Esta guía distingue entre archivos presentes en el repositorio y componentes desplegados. La verificación activa de funciones, secretos y backups se detalla en las secciones correspondientes.

Los SQL operativos están ubicados en `Admin/` y `supabase/sql/`. Esta guía inventaría esos scripts y establece un orden seguro para aplicarlos sobre una base existente. La migración de políticas no contiene asignaciones de usuarios por correo; para otorgar el rol se usa `supabase/admin-role-assignment.sql` con UUIDs de Auth.

## Organización del proyecto

- La raíz contiene el sitio público (`index.html`, `style.css`, `js/`, `logo/`, `site.webmanifest` y `sw.js`) porque Cloudflare Pages publica desde esa carpeta.
- `Admin/` contiene el panel administrativo y sus scripts SQL.
- `supabase/sql/` contiene scripts SQL operativos de Supabase.
- `supabase/functions/` y `supabase/migrations/` contienen funciones y migraciones.
- `Informacion/` contiene esta guía y la documentación del proyecto.

## Roles y permisos

Los roles se guardan en `auth.users.raw_app_meta_data.role` y solo un administrador puede cambiarlos desde **Administración > Usuarios**. No se debe confiar únicamente en los controles visuales: las políticas RLS y las funciones RPC aplican los permisos en Supabase. La función `public.current_app_role()` consulta el rol vigente en Auth, por lo que un cambio de rol se aplica también a las solicitudes realizadas con una sesión que ya estaba abierta.

| Rol | Permisos |
| --- | --- |
| `admin` | Acceso completo al panel, a la operación de envíos y a la gestión de cuentas y roles. Debe permanecer al menos un administrador autorizado. |
| `editor` | Acceso completo a las operaciones de envíos, incluida la importación, edición, eliminación, auditoría y asignación de repartidores. No puede invitar, eliminar ni cambiar roles de cuentas. |
| `repartidor` | Acceso a `Admin/repartidor.html`; solo puede consultar pedidos asignados a su cuenta y avanzar el estado de `en sucursal` a `en camino` y luego a `recibido`. No puede editar datos, importar, eliminar ni cambiar roles. |

Las asignaciones individuales se guardan en `public.delivery_assignments`. Administradores y editores las crean desde el menú contextual de un envío. Los repartidores consultan únicamente registros asignados, tanto mediante RLS como en la pantalla dedicada. Los pedidos de `paquetes_ruta` se muestran como información; el estado de entrega solo se puede avanzar cuando existe un registro asociado en `envios`, y se actualiza `envios.estado_envio` (no `ruta_estado`).

## Inventario de scripts disponibles

| Archivo actual | Propósito | Requisitos y observaciones |
| --- | --- | --- |
| `supabase/sql/supabase-rls.sql` | Activa RLS en `envios`, limita operaciones administrativas por el claim `app_metadata.role`, crea `admin_presence` y define `consultar_envio`. | Requiere `public.envios`. No asigna roles a usuarios. La RPC `consultar_envio` es invocable por `anon` y `authenticated` y devuelve código, estado y última actualización. |
| `supabase/migrations/20261014100000_admin_access_and_public_tracking.sql` | Versión fechada de las políticas de `envios`, `admin_presence` y la RPC pública de rastreo. | Requiere que exista `public.envios` con `tracking_code`, `estado_envio` y `ultima_actualizacion`. No es el baseline del esquema inicial. |
| `supabase/migrations/20261015120000_public_tracking_rate_limit.sql` | Limita `consultar_envio` a 20 solicitudes por minuto y por IP; almacena un HMAC en el esquema privado y devuelve HTTP 429 al exceder el límite. | Requiere `pgcrypto` en `extensions` y un `cf-connecting-ip` que provenga de un proxy confiable. El dashboard no registra migraciones aplicadas; validar en producción que el encabezado no pueda falsificarse o mover el límite a una capa que controle la IP real. |
| `supabase/migrations/20261021120000_admin_status_audit.sql` | Registra cambios reales de estado en `envios`, `paquetes_ruta` y `Xcargo`, atribuidos al UUID y correo autenticados, y permite que administradores consulten el historial. | Requiere las tres tablas y sus columnas de estado/identidad. Aplicar una vez desde el SQL Editor; no reconstruye eventos anteriores a su instalación. |
| `supabase/migrations/20261021143000_admin_account_managers.sql` | Migración histórica que registra los tres administradores iniciales como gestores de cuentas. | La nueva función `manage-admin-users` ya no usa esta allowlist: cualquier cuenta con rol `admin` administra cuentas. La tabla se conserva por compatibilidad histórica. |
| `supabase/migrations/20261023124000_role_based_access_and_delivery_assignments.sql` | Aplica los roles admin/editor/repartidor, RLS para los tres orígenes de pedidos, asignaciones individuales, la RPC para avanzar estados y permisos de auditoría para editores. | Requiere `envios`, `paquetes_ruta`, `Xcargo`, `admin_presence` y `admin_status_audit`. Las filas existentes conservan su rol actual. Aplicar después de las migraciones iniciales de acceso, paquetes de ruta y auditoría. |
| `supabase/migrations/20261023160000_activity_logs_and_courier_overview.sql` | Crea los logs de actividad, auditoría de cambios/asignaciones, consulta filtrada para admin/editor y purga de registros con más de siete días mediante `pg_cron`. | Aplicar después de la migración de roles. Requiere `pg_cron` disponible en Supabase y las tablas `envios`, `paquetes_ruta`, `Xcargo` y `delivery_assignments`. Los eventos empiezan al instalar la migración; no reconstruye actividad histórica. |
| `supabase/migrations/20261023180000_fix_activity_logs_created_at_ambiguity.sql` | Reemplaza la función de consulta de Logs, calificando la columna de fecha para evitar el conflicto con la columna de salida `created_at`. | Aplicar después de la migración de actividad si la consulta devuelve `column reference "created_at" is ambiguous`. No requiere volver a ejecutar las migraciones anteriores. |
| `supabase/functions/manage-admin-users/index.ts` | Comprueba la sesión y el rol en Auth; permite que administradores administren cuentas y roles, que administradores/editores consulten repartidores para asignar pedidos, y que las invitaciones creen cuentas con el rol seleccionado. | Desplegada como `manage-admin-users` con `SUPABASE_SERVICE_ROLE_KEY` configurada. El 23 de octubre de 2026 se actualizó en producción el destino de las invitaciones a `Admin/admin.html?password_setup=1`. Mantener desactivada la opción legacy **Verify JWT with legacy secret**; la función verifica internamente la sesión, el rol y la autenticación reciente. Auth no tiene SMTP personalizado configurado; el proveedor integrado permite 2 correos por hora. Invitaciones y restablecimientos consumen este límite; si se alcanza, esperar a que se renueve o configurar SMTP personalizado antes de repetir pruebas. |
| Supabase Auth > URL Configuration | Permite que las invitaciones y enlaces de configuración de contraseña regresen al panel publicado. | En producción están permitidas `https://jlexpress.pages.dev/Admin/admin.html` y `https://jlexpress.pages.dev/Admin/admin.html?password_setup=1` desde el 23 de octubre de 2026. `Site URL` se mantiene en `http://localhost:3000`; no se modificó el valor predeterminado. El frontend que consume `password_setup=1` aún debe publicarse en Cloudflare Pages. |
| `supabase/migrations/20261014103000_default_shipment_status.sql` | Establece `en sucursal` como estado por defecto en `public.envios` y rellena estados actuales `NULL`. | Ejecutar solo si las filas que tienen estado `NULL` deben pasar a `en sucursal`. |
| `supabase/admin-role-assignment.sql` | Plantilla de bootstrap para asignar inicialmente el rol `admin` a cuentas autorizadas y sincronizarlas con `admin_presence`. | Reemplazar el UUID de ejemplo por UUIDs reales. Después del bootstrap, invitar cuentas y cambiar roles desde el panel; no asignar roles según correo. |
| `Admin/supabase-envios-id-management.sql` | Crea RPC administrativas/editoras para borrar envíos y sincronizar la secuencia de `id_excel`. | Requiere `public.envios.id_excel` asociado a una secuencia. `debug_borrar_envios` elimina todos los envíos; usar con cuidado. La migración de roles recrea estas funciones y valida el rol vigente en Auth. |
| `Admin/supabase-route-import-fields.sql` | Crea y protege `public.paquetes_ruta`; si encuentra las 13 columnas esperadas en `envios`, migra los datos de ruta existentes. | Requiere `public.envios`. El backfill se omite si falta cualquiera de esas columnas. |
| `supabase/sql/supabase-notifications-setup.sql` | Tablas de suscripción por correo, control de solicitudes y RPC de confirmación/cancelación. | Requerido para avisos por correo enviados mediante Gmail API desde las Edge Functions. |
| `supabase/sql/supabase-push-notifications-setup.sql` | Crea `public.notificaciones_push` y restringe sus endpoints y claves a `service_role`. | Requiere `public.envios.tracking_code`. Es la tabla usada por las notificaciones push. |
| `supabase/sql/supabase-tracking-function.sql` | Define la RPC pública `consultar_envio`. | Es la misma definición que ya incluye `supabase/sql/supabase-rls.sql`; no hace falta ejecutarlo después de ese script salvo para volver a crear la función. |

## Orden de ejecución actual

Antes de aplicar cambios, confirmar que existe un backup externo reciente y restaurable; al 15 de octubre de 2026, el dashboard no mostraba backups nativos y no se pudo verificar la última ejecución/artifact del workflow externo. Comprobar también que `public.envios` existe con las columnas y secuencia que esperan los scripts. En una instalación existente, comparar primero la migración fechada con las políticas actuales para no volver a aplicar cambios a ciegas. Para una base nueva, obtener el DDL real mediante `supabase db pull` usando acceso autorizado al proyecto y guardarlo como migración inicial antes de aplicar las siguientes. Ejecutar los scripts operativos desde el SQL Editor de Supabase, revisando el resultado de cada paso:

1. Aplicar la migración fechada de acceso después de incorporar el baseline verificado de `public.envios`; después, aplicar `20261015120000_public_tracking_rate_limit.sql`.
2. Aplicar `supabase/migrations/20261014103000_default_shipment_status.sql` si las filas con estado `NULL` deben quedar como `en sucursal`.
3. Ejecutar `supabase/admin-role-assignment.sql` una sola vez con los UUIDs de Auth de las cuentas administradoras iniciales, después de crear `admin_presence`.
4. Aplicar `Admin/supabase-envios-id-management.sql` solo si `id_excel` tiene una secuencia asociada.
5. Aplicar `Admin/supabase-route-import-fields.sql`. Comprobar en particular si el bloque de backfill encontró las 13 columnas requeridas.
6. Aplicar `supabase/sql/supabase-push-notifications-setup.sql` para push. Aplicar también `supabase/sql/supabase-notifications-setup.sql` para avisos por correo.
7. Omitir `supabase/sql/supabase-tracking-function.sql` si ya se ejecutó la migración de acceso; ambos crean la misma RPC.
8. La migración `supabase/migrations/20261021120000_admin_status_audit.sql` se aplicó en producción el 21 de octubre de 2026 y habilita el botón **Registro de estados** en el panel. La auditoría cubre cambios posteriores al despliegue; no puede recuperar quién realizó cambios históricos previos.
9. El sistema de cuentas anterior usaba una allowlist de tres gestores. El flujo actual de roles reemplaza esa restricción: cualquier administrador puede invitar cuentas con rol explícito, cambiar su rol y eliminar cuentas autorizadas, conservando al menos un administrador. Editores no pueden gestionar cuentas. Para que la lista muestre los roles, despliega `Admin/admin.html`, `Admin/admin.css`, `Admin/js/admin.js` y la Edge Function `manage-admin-users`.
10. Aplicar `supabase/migrations/20261023124000_role_based_access_and_delivery_assignments.sql` después de verificar que existen todas las tablas requeridas. Desplegar también la Edge Function actualizada y publicar los archivos de administración y `Admin/repartidor.html`, `Admin/repartidor.css` y `Admin/js/repartidor.js`. Las cuentas `admin` existentes se conservan como administradores; los nuevos repartidores solo verán pedidos que un administrador o editor les asigne.
11. Aplicar `supabase/migrations/20261023160000_activity_logs_and_courier_overview.sql` después de la migración de roles. Si `CREATE EXTENSION pg_cron` indica que la extensión no está disponible, habilitar `pg_cron` desde **Database > Extensions** y volver a ejecutar la migración. Después, desplegar de nuevo `manage-admin-users` desde `supabase/functions/manage-admin-users/index.ts` y publicar `Admin/admin.html`, `Admin/admin.css` y `Admin/js/admin.js`. Verificar el drawer, el resumen de repartidores, el filtro de Logs y eventos de prueba (edición, cambio de estado, importación y asignación); el evento de importación guarda únicamente el nombre del archivo, no su ruta ni contenido. La purga automática se ejecuta cada hora; la consulta y los nuevos registros también eliminan cualquier fila vencida.
12. Si al abrir Logs aparece `column reference "created_at" is ambiguous`, ejecutar únicamente `supabase/migrations/20261023180000_fix_activity_logs_created_at_ambiguity.sql` en el SQL Editor. Esta corrección es independiente y no vuelve a crear ni borra los registros.

## Notificaciones push web

El sitio debe estar publicado en HTTPS. Cloudflare Pages (`jlexpress.pages.dev`) cumple este requisito; no hace falta comprar un dominio. En cada dispositivo, la persona debe aceptar el permiso del navegador. En iPhone/iPad, primero debe añadir el sitio a la pantalla de inicio y abrirlo como app web.

1. Generar un par de claves VAPID en una terminal con `npx --yes web-push generate-vapid-keys`. Guardar ambas claves de forma privada durante la configuración.
2. En **Supabase > Edge Functions > Secrets**, configurar `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` y `WEBHOOK_SECRET`. Verificación del 15 de octubre de 2026: los cuatro nombres aparecen configurados en el proyecto. Confirmar mediante la prueba push que `VAPID_PUBLIC_KEY` coincide con la constante del frontend y que el webhook usa el mismo `WEBHOOK_SECRET`; el dashboard no permite confirmar esos valores sin exponerlos. Poner como asunto `mailto:jlexpressturrialba@gmail.com`. La clave privada nunca se publica ni se agrega al frontend.
3. Copiar únicamente la clave pública generada en la constante `VAPID_PUBLIC_KEY` de `js/script.js`; desplegar el sitio de nuevo.
4. Desplegar ambas funciones con `supabase functions deploy manage-push-subscription --project-ref swpvtfjbseftynnhflfi --no-verify-jwt` y `supabase functions deploy send-push-update --project-ref swpvtfjbseftynnhflfi --no-verify-jwt`. Verificación del 15 de octubre de 2026: ambas aparecen desplegadas. `manage-push-subscription` valida el pedido y restringe el encabezado `Origin`; `send-push-update` valida el webhook mediante `WEBHOOK_SECRET`.
5. En **Supabase > Database > Webhooks**, crear un webhook HTTP para `public.envios`, evento `UPDATE`, método `POST`, con URL `https://swpvtfjbseftynnhflfi.supabase.co/functions/v1/send-push-update`.
6. Agregar `x-webhook-secret` con el mismo valor del secreto existente `WEBHOOK_SECRET`, guardar el webhook y publicar el sitio actualizado.
7. Probar con un pedido válido: aceptar el permiso en el navegador, confirmar que aparece una fila en `notificaciones_push`, cambiar `estado_envio` y revisar los logs de `send-push-update` y la notificación del dispositivo.

El webhook debe enviar el payload estándar de Supabase con `type`, `table`, `record` y `old_record`. Solo se notifica cuando cambia `estado_envio` en `envios`; no se envían push para `Xcargo` ni `paquetes_ruta`. La suscripción se guarda por combinación de pedido y dispositivo, y RLS bloquea el acceso público a los endpoints push. La persona puede desactivar el permiso desde la configuración de notificaciones del navegador.

**Pendiente de seguridad antes de producción:** `manage-push-subscription` es una función pública y actualmente no aplica límite de solicitudes. La comprobación de `Origin` es una restricción para navegadores, no autenticación del cliente. Añadir límites de abuso por IP/dispositivo y probar solicitudes automatizadas antes de considerar protegido el alta de suscripciones.

Las tablas `notificaciones_envio` y `notificaciones_solicitudes` se conservan para los avisos de seguimiento por correo; no son tablas exclusivas de Resend. El código vigente de `manage-tracking-subscription` y `send-tracking-update` las usa junto con Gmail API, por lo que eliminarlas rompería las altas, confirmaciones, cancelaciones, límites de solicitudes y avisos por cambio de estado. En la consulta de solo lectura a producción del 23 de octubre de 2026 ambas tenían cero filas; que estén vacías no significa que sean prescindibles.

Estas tablas quedan reservadas para mantener el servicio de correo y permitir que, cuando se configure un dominio propio en Cloudflare, los avisos puedan enviarse desde una dirección de marca. Cloudflare Pages y el dominio por sí solos no envían correo: para usar una dirección del dominio hay que configurar Google Workspace o verificar un alias de envío en Gmail, completar los registros MX, SPF y DKIM indicados por Google en Cloudflare DNS con proxy desactivado, configurar `GMAIL_FROM_EMAIL` y probar el flujo completo. El código actual usa Gmail API, no Resend; no cambiar de proveedor sin una migración deliberada de las funciones y sus secretos. Estas tablas son independientes del sistema push; conservar ambas rutas si se ofrecen ambos métodos.

## Avisos de seguimiento por correo con Gmail

Cloudflare Pages publica el sitio, pero no es un servicio de envío de correo. Cloudflare Email Routing sirve para recibir o reenviar mensajes; no sustituye Gmail API para enviar. El formulario guarda la suscripción confirmada en Supabase y las Edge Functions envían tanto la confirmación como los cambios de estado mediante Gmail API. El correo y push se pueden ofrecer al mismo tiempo.

1. En Google Cloud, habilitar Gmail API y configurar la pantalla de consentimiento OAuth. Crear un cliente OAuth y permitir la cuenta que enviará los avisos. Para obtener el refresh token se puede usar OAuth 2.0 Playground con credenciales propias y el alcance `https://www.googleapis.com/auth/gmail.send`; el redirect URI del cliente debe incluir `https://developers.google.com/oauthplayground`. Guardar el refresh token de forma privada. Una app externa en modo de prueba puede emitir refresh tokens que vencen a los 7 días; revisar el estado de publicación y las condiciones de verificación de Google antes de producción.
2. En **Supabase > Edge Functions > Secrets**, configurar `GMAIL_CLIENT_ID`, `GMAIL_CLIENT_SECRET`, `GMAIL_REFRESH_TOKEN` y `GMAIL_FROM_EMAIL`. El valor de `GMAIL_FROM_EMAIL` debe ser la cuenta autorizada en OAuth o un alias de envío verificado en esa cuenta. No guardar estas credenciales en los archivos públicos del sitio.
3. Aplicar `supabase/sql/supabase-notifications-setup.sql` si sus tablas y RPC aún no existen. Desplegar las funciones desde la raíz del proyecto con `supabase functions deploy manage-tracking-subscription --project-ref swpvtfjbseftynnhflfi --no-verify-jwt` y `supabase functions deploy send-tracking-update --project-ref swpvtfjbseftynnhflfi --no-verify-jwt`.
4. En **Supabase > Database > Webhooks**, crear un webhook separado para `public.envios`, evento `UPDATE`, método `POST`, URL `https://swpvtfjbseftynnhflfi.supabase.co/functions/v1/send-tracking-update`. Enviar `x-webhook-secret` con el secreto `WEBHOOK_SECRET`. Si push está habilitado, mantener también su webhook independiente hacia `send-push-update`.
5. Mantener `UNSUBSCRIBE_SECRET`, `EMAIL_LOGO_URL`, `SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY` configurados para las funciones de correo. Probar el alta, el correo de confirmación, un cambio de estado y la cancelación. Consultar los logs de ambas funciones si Gmail rechaza la autorización o el mensaje.

Cuando se compre `jlexpresscr.com`, asociarlo primero desde **Cloudflare Pages > Custom domains** y verificar que el sitio abra con HTTPS. Después, en **Supabase > Authentication > URL Configuration**, agregar `https://jlexpresscr.com/Admin/admin.html` a **Redirect URLs** y cambiar **Site URL** de `http://localhost:3000` a `https://jlexpresscr.com`. Mantener `https://jlexpress.pages.dev/Admin/admin.html` permitido mientras se siga usando el subdominio Pages. Actualizar también `siteUrl` en `supabase/functions/manage-admin-users/index.ts` a `https://jlexpresscr.com` y redesplegar la función para que las invitaciones nuevas regresen al dominio comprado. Si se configura `www.jlexpresscr.com`, agregarlo además a Cloudflare Pages y a Redirect URLs, y decidir cuál dominio será el principal antes de cambiar estas URLs. No hacer estos cambios hasta que el dominio y HTTPS estén verificados.

El dominio no es requisito para enviar con una cuenta `@gmail.com`. Para enviar desde una dirección del dominio se necesita Google Workspace o un alias verificado en Gmail; seguir los registros MX, SPF y DKIM que indique Google en Cloudflare DNS y dejarlos como DNS only. No activar proxy en los registros de correo.

## Pendiente para migraciones versionadas

- Recuperar y documentar desde Supabase el DDL real de `public.envios`, incluidos tipos, valores por defecto, claves, índices y secuencia de `id_excel`.
- Crear la migración inicial de `public.envios` a partir de ese DDL y probarla en una base de desarrollo, sin recrear ni alterar la tabla de producción.
- Convertir los scripts operativos a migraciones numeradas, evitando duplicar `consultar_envio` y probando el orden en una base limpia y otra con datos.
- Registrar el despliegue y la configuración de secretos de las Edge Functions como operaciones separadas de las migraciones SQL.

## Pruebas E2E con IA y navegador

Para validar recorridos completos de la aplicación con un agente de IA y un navegador, usar exclusivamente un entorno local o de staging y archivos de prueba con datos sintéticos. La persona autorizada inicia sesión directamente en el navegador; no compartir credenciales, cargar archivos reales ni ejecutar acciones destructivas en producción.

La preparación, el flujo de importación, los criterios de aceptación y las plantillas de mensaje y prompt están en [Pruebas E2E con IA y navegador](Pruebas-E2E-con-IA.md).
