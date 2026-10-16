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

## Inventario de scripts disponibles

| Archivo actual | Propósito | Requisitos y observaciones |
| --- | --- | --- |
| `supabase/sql/supabase-rls.sql` | Activa RLS en `envios`, limita operaciones administrativas por el claim `app_metadata.role`, crea `admin_presence` y define `consultar_envio`. | Requiere `public.envios`. No asigna roles a usuarios. La RPC `consultar_envio` es invocable por `anon` y `authenticated` y devuelve código, estado y última actualización. |
| `supabase/migrations/20261014100000_admin_access_and_public_tracking.sql` | Versión fechada de las políticas de `envios`, `admin_presence` y la RPC pública de rastreo. | Requiere que exista `public.envios` con `tracking_code`, `estado_envio` y `ultima_actualizacion`. No es el baseline del esquema inicial. |
| `supabase/migrations/20261015120000_public_tracking_rate_limit.sql` | Limita `consultar_envio` a 20 solicitudes por minuto y por IP; almacena un HMAC en el esquema privado y devuelve HTTP 429 al exceder el límite. | Requiere `pgcrypto` en `extensions` y un `cf-connecting-ip` que provenga de un proxy confiable. El dashboard no registra migraciones aplicadas; validar en producción que el encabezado no pueda falsificarse o mover el límite a una capa que controle la IP real. |
| `supabase/migrations/20261014103000_default_shipment_status.sql` | Establece `en sucursal` como estado por defecto en `public.envios` y rellena estados actuales `NULL`. | Ejecutar solo si las filas que tienen estado `NULL` deben pasar a `en sucursal`. |
| `supabase/admin-role-assignment.sql` | Plantilla operativa para asignar un claim `app_metadata.role` a usuarios de Auth y sincronizarlos con `admin_presence`. | Reemplazar el UUID de ejemplo por UUIDs reales. Ejecutar en SQL Editor después de crear `admin_presence`; nunca asigna roles según correo. |
| `Admin/supabase-envios-id-management.sql` | Crea RPC administrativas para borrar envíos y sincronizar la secuencia de `id_excel`. | Requiere `public.envios.id_excel` asociado a una secuencia. Las funciones verifican el claim administrativo. `debug_borrar_envios` elimina todos los envíos; usar con cuidado. |
| `Admin/supabase-route-import-fields.sql` | Crea y protege `public.paquetes_ruta`; si encuentra las 13 columnas esperadas en `envios`, migra los datos de ruta existentes. | Requiere `public.envios`. El backfill se omite si falta cualquiera de esas columnas. |
| `supabase/sql/supabase-notifications-setup.sql` | Flujo anterior de avisos por correo: tablas de suscripción y control de solicitudes y RPC de confirmación/cancelación. | No se usa en el flujo push. Se puede conservar durante la transición; no borrar tablas hasta verificar que ya no se necesitan suscripciones de correo. |
| `supabase/sql/supabase-push-notifications-setup.sql` | Crea `public.notificaciones_push` y restringe sus endpoints y claves a `service_role`. | Requiere `public.envios.tracking_code`. Es la tabla usada por las notificaciones push. |
| `supabase/sql/supabase-tracking-function.sql` | Define la RPC pública `consultar_envio`. | Es la misma definición que ya incluye `supabase/sql/supabase-rls.sql`; no hace falta ejecutarlo después de ese script salvo para volver a crear la función. |

## Orden de ejecución actual

Antes de aplicar cambios, confirmar que existe un backup externo reciente y restaurable; al 15 de octubre de 2026, el dashboard no mostraba backups nativos y no se pudo verificar la última ejecución/artifact del workflow externo. Comprobar también que `public.envios` existe con las columnas y secuencia que esperan los scripts. En una instalación existente, comparar primero la migración fechada con las políticas actuales para no volver a aplicar cambios a ciegas. Para una base nueva, obtener el DDL real mediante `supabase db pull` usando acceso autorizado al proyecto y guardarlo como migración inicial antes de aplicar las siguientes. Ejecutar los scripts operativos desde el SQL Editor de Supabase, revisando el resultado de cada paso:

1. Aplicar la migración fechada de acceso después de incorporar el baseline verificado de `public.envios`; después, aplicar `20261015120000_public_tracking_rate_limit.sql`.
2. Aplicar `supabase/migrations/20261014103000_default_shipment_status.sql` si las filas con estado `NULL` deben quedar como `en sucursal`.
3. Ejecutar `supabase/admin-role-assignment.sql` con los UUIDs de Auth autorizados, después de crear `admin_presence`. Los usuarios deben renovar su sesión para recibir el claim actualizado en el JWT.
4. Aplicar `Admin/supabase-envios-id-management.sql` solo si `id_excel` tiene una secuencia asociada.
5. Aplicar `Admin/supabase-route-import-fields.sql`. Comprobar en particular si el bloque de backfill encontró las 13 columnas requeridas.
6. Para el flujo nuevo de notificaciones push, aplicar `supabase/sql/supabase-push-notifications-setup.sql`. El SQL anterior `supabase/sql/supabase-notifications-setup.sql` solo se requiere si se desea conservar el flujo de correo.
7. Omitir `supabase/sql/supabase-tracking-function.sql` si ya se ejecutó la migración de acceso; ambos crean la misma RPC.

## Notificaciones push web

El sitio debe estar publicado en HTTPS. Cloudflare Pages (`jlexpress.pages.dev`) cumple este requisito; no hace falta comprar un dominio. En cada dispositivo, la persona debe aceptar el permiso del navegador. En iPhone/iPad, primero debe añadir el sitio a la pantalla de inicio y abrirlo como app web.

1. Generar un par de claves VAPID en una terminal con `npx --yes web-push generate-vapid-keys`. Guardar ambas claves de forma privada durante la configuración.
2. En **Supabase > Edge Functions > Secrets**, configurar `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` y `WEBHOOK_SECRET`. Verificación del 15 de octubre de 2026: los cuatro nombres aparecen configurados en el proyecto. Confirmar mediante la prueba push que `VAPID_PUBLIC_KEY` coincide con la constante del frontend y que el webhook usa el mismo `WEBHOOK_SECRET`; el dashboard no permite confirmar esos valores sin exponerlos. Poner como asunto `mailto:jlexpressmensajeriaturri@gmail.com`. La clave privada nunca se publica ni se agrega al frontend.
3. Copiar únicamente la clave pública generada en la constante `VAPID_PUBLIC_KEY` de `js/script.js`; desplegar el sitio de nuevo.
4. Desplegar ambas funciones con `supabase functions deploy manage-push-subscription --project-ref swpvtfjbseftynnhflfi --no-verify-jwt` y `supabase functions deploy send-push-update --project-ref swpvtfjbseftynnhflfi --no-verify-jwt`. Verificación del 15 de octubre de 2026: ambas aparecen desplegadas. `manage-push-subscription` valida el pedido y restringe el encabezado `Origin`; `send-push-update` valida el webhook mediante `WEBHOOK_SECRET`.
5. En **Supabase > Database > Webhooks**, crear un webhook HTTP para `public.envios`, evento `UPDATE`, método `POST`, con URL `https://swpvtfjbseftynnhflfi.supabase.co/functions/v1/send-push-update`.
6. Agregar `x-webhook-secret` con el mismo valor del secreto existente `WEBHOOK_SECRET`, guardar el webhook y publicar el sitio actualizado.
7. Probar con un pedido válido: aceptar el permiso en el navegador, confirmar que aparece una fila en `notificaciones_push`, cambiar `estado_envio` y revisar los logs de `send-push-update` y la notificación del dispositivo.

El webhook debe enviar el payload estándar de Supabase con `type`, `table`, `record` y `old_record`. Solo se notifica cuando cambia `estado_envio` en `envios`; no se envían push para `Xcargo` ni `paquetes_ruta`. La suscripción se guarda por combinación de pedido y dispositivo, y RLS bloquea el acceso público a los endpoints push. La persona puede desactivar el permiso desde la configuración de notificaciones del navegador.

**Pendiente de seguridad antes de producción:** `manage-push-subscription` es una función pública y actualmente no aplica límite de solicitudes. La comprobación de `Origin` es una restricción para navegadores, no autenticación del cliente. Añadir límites de abuso por IP/dispositivo y probar solicitudes automatizadas antes de considerar protegido el alta de suscripciones.

Las tablas `notificaciones_envio` y `notificaciones_solicitudes`, junto con `manage-tracking-subscription` y `send-tracking-update`, pertenecen al flujo anterior de correo. No son necesarias para push y se pueden dejar sin cambios durante la transición. No borrar datos ni funciones hasta completar y verificar una prueba push.

## Pendiente para migraciones versionadas

- Recuperar y documentar desde Supabase el DDL real de `public.envios`, incluidos tipos, valores por defecto, claves, índices y secuencia de `id_excel`.
- Crear la migración inicial de `public.envios` a partir de ese DDL y probarla en una base de desarrollo, sin recrear ni alterar la tabla de producción.
- Convertir los scripts operativos a migraciones numeradas, evitando duplicar `consultar_envio` y probando el orden en una base limpia y otra con datos.
- Registrar el despliegue y la configuración de secretos de las Edge Functions como operaciones separadas de las migraciones SQL.
