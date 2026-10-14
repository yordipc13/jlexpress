# Migraciones y operaciones de Supabase

## Estado

La aplicación está conectada a una instancia de Supabase donde existe `public.envios`. Se añadió una migración fechada para las políticas de acceso y el rastreo público, pero el DDL que creó `public.envios` no está guardado en este repositorio. Por eso, todavía no se puede reconstruir toda la base desde cero ni aplicar esa migración en una base vacía: la migración valida que la tabla preexistente tenga las columnas requeridas.

La clave pública configurada en el cliente permite comprobar el endpoint, pero no consultar el documento OpenAPI ni leer el DDL. Para documentar y versionar el esquema inicial, obtenerlo desde el proyecto Supabase con acceso autorizado y compararlo con la base existente antes de crear una migración; no volver a ejecutar una creación de tabla sobre producción sin esa comparación.

Los SQL operativos restantes están ubicados en `Admin/` y `Public/`. Este documento los inventaría y establece un orden seguro para aplicarlos sobre una base existente. La migración de políticas no contiene asignaciones de usuarios por correo; para otorgar el rol se usa `supabase/admin-role-assignment.sql` con UUIDs de Auth.

## Inventario de scripts disponibles

| Archivo actual | Propósito | Requisitos y observaciones |
| --- | --- | --- |
| `Public/supabase-rls.sql` | Activa RLS en `envios`, limita operaciones administrativas por el claim `app_metadata.role`, crea `admin_presence` y define `consultar_envio`. | Requiere `public.envios`. No asigna roles a usuarios. La RPC `consultar_envio` es invocable por `anon` y `authenticated` y devuelve código, estado y última actualización. |
| `supabase/migrations/20261014100000_admin_access_and_public_tracking.sql` | Versión fechada de las políticas de `envios`, `admin_presence` y la RPC pública de rastreo. | Requiere que exista `public.envios` con `tracking_code`, `estado_envio` y `ultima_actualizacion`. No es el baseline del esquema inicial. |
| `supabase/migrations/20261014103000_default_shipment_status.sql` | Establece `en sucursal` como estado por defecto en `public.envios` y rellena estados actuales `NULL`. | Ejecutar solo si las filas que tienen estado `NULL` deben pasar a `en sucursal`. |
| `supabase/admin-role-assignment.sql` | Plantilla operativa para asignar un claim `app_metadata.role` a usuarios de Auth y sincronizarlos con `admin_presence`. | Reemplazar el UUID de ejemplo por UUIDs reales. Ejecutar en SQL Editor después de crear `admin_presence`; nunca asigna roles según correo. |
| `Admin/supabase-envios-id-management.sql` | Crea RPC administrativas para borrar envíos y sincronizar la secuencia de `id_excel`. | Requiere `public.envios.id_excel` asociado a una secuencia. Las funciones verifican el claim administrativo. `debug_borrar_envios` elimina todos los envíos; usar con cuidado. |
| `Admin/supabase-route-import-fields.sql` | Crea y protege `public.paquetes_ruta`; si encuentra las 13 columnas esperadas en `envios`, migra los datos de ruta existentes. | Requiere `public.envios`. El backfill se omite si falta cualquiera de esas columnas. |
| `Public/supabase-notifications-setup.sql` | Flujo anterior de avisos por correo: tablas de suscripción y control de solicitudes y RPC de confirmación/cancelación. | No se usa en el flujo push. Se puede conservar durante la transición; no borrar tablas hasta verificar que ya no se necesitan suscripciones de correo. |
| `supabase-push-notifications-setup.sql` | Crea `public.notificaciones_push` y restringe sus endpoints y claves a `service_role`. | Requiere `public.envios.tracking_code`. Es la tabla usada por las notificaciones push. |
| `Public/supabase-tracking-function.sql` | Define la RPC pública `consultar_envio`. | Es la misma definición que ya incluye `Public/supabase-rls.sql`; no hace falta ejecutarlo después de ese script salvo para volver a crear la función. |

## Orden de ejecución actual

Antes de aplicar cambios, hacer un respaldo de la base y comprobar que `public.envios` existe con las columnas y secuencia que esperan los scripts. En una instalación existente, comparar primero la migración fechada con las políticas actuales para no volver a aplicar cambios a ciegas. Para una base nueva, obtener el DDL real mediante `supabase db pull` usando acceso autorizado al proyecto y guardarlo como migración inicial antes de aplicar las siguientes. Ejecutar los scripts operativos desde el SQL Editor de Supabase, revisando el resultado de cada paso:

1. Aplicar la migración fechada de acceso después de incorporar el baseline verificado de `public.envios`.
2. Aplicar `supabase/migrations/20261014103000_default_shipment_status.sql` si las filas con estado `NULL` deben quedar como `en sucursal`.
3. Ejecutar `supabase/admin-role-assignment.sql` con los UUIDs de Auth autorizados, después de crear `admin_presence`. Los usuarios deben renovar su sesión para recibir el claim actualizado en el JWT.
4. Aplicar `Admin/supabase-envios-id-management.sql` solo si `id_excel` tiene una secuencia asociada.
5. Aplicar `Admin/supabase-route-import-fields.sql`. Comprobar en particular si el bloque de backfill encontró las 13 columnas requeridas.
6. Para el flujo nuevo de notificaciones push, aplicar `supabase-push-notifications-setup.sql`. El SQL anterior `Public/supabase-notifications-setup.sql` solo se requiere si se desea conservar el flujo de correo.
7. Omitir `Public/supabase-tracking-function.sql` si ya se ejecutó la migración de acceso; ambos crean la misma RPC.

## Notificaciones push web

El sitio debe estar publicado en HTTPS. Cloudflare Pages (`jlexpress.pages.dev`) cumple este requisito; no hace falta comprar un dominio. En cada dispositivo, la persona debe aceptar el permiso del navegador. En iPhone/iPad, primero debe añadir el sitio a la pantalla de inicio y abrirlo como app web.

1. Generar un par de claves VAPID en una terminal con `npx --yes web-push generate-vapid-keys`. Guardar ambas claves de forma privada durante la configuración.
2. En **Supabase > Edge Functions > Secrets**, agregar `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` y `VAPID_SUBJECT`. Poner como asunto `mailto:jlexpressmensajeriaturri@gmail.com`. La clave privada nunca se publica ni se agrega al frontend.
3. Copiar únicamente la clave pública generada en la constante `VAPID_PUBLIC_KEY` de `js/script.js`; desplegar el sitio de nuevo.
4. Desplegar ambas funciones con `supabase functions deploy manage-push-subscription --project-ref swpvtfjbseftynnhflfi --no-verify-jwt` y `supabase functions deploy send-push-update --project-ref swpvtfjbseftynnhflfi --no-verify-jwt`. La función de suscripción valida el pedido y limita el origen al sitio; la función de envío valida el webhook mediante `WEBHOOK_SECRET`.
5. En **Supabase > Database > Webhooks**, crear un webhook HTTP para `public.envios`, evento `UPDATE`, método `POST`, con URL `https://swpvtfjbseftynnhflfi.supabase.co/functions/v1/send-push-update`.
6. Agregar `x-webhook-secret` con el mismo valor del secreto existente `WEBHOOK_SECRET`, guardar el webhook y publicar el sitio actualizado.
7. Probar con un pedido válido: aceptar el permiso en el navegador, confirmar que aparece una fila en `notificaciones_push`, cambiar `estado_envio` y revisar los logs de `send-push-update` y la notificación del dispositivo.

El webhook debe enviar el payload estándar de Supabase con `type`, `table`, `record` y `old_record`. Solo se notifica cuando cambia `estado_envio` en `envios`; no se envían push para `Xcargo` ni `paquetes_ruta`. La suscripción se guarda por combinación de pedido y dispositivo, y RLS bloquea el acceso público a los endpoints push. La persona puede desactivar el permiso desde la configuración de notificaciones del navegador.

Las tablas `notificaciones_envio` y `notificaciones_solicitudes`, junto con `manage-tracking-subscription` y `send-tracking-update`, pertenecen al flujo anterior de correo. No son necesarias para push y se pueden dejar sin cambios durante la transición. No borrar datos ni funciones hasta completar y verificar una prueba push.

## Pendiente para migraciones versionadas

- Recuperar y documentar desde Supabase el DDL real de `public.envios`, incluidos tipos, valores por defecto, claves, índices y secuencia de `id_excel`.
- Crear la migración inicial de `public.envios` a partir de ese DDL y probarla en una base de desarrollo, sin recrear ni alterar la tabla de producción.
- Convertir los scripts operativos a migraciones numeradas, evitando duplicar `consultar_envio` y probando el orden en una base limpia y otra con datos.
- Registrar el despliegue y la configuración de secretos de las Edge Functions como operaciones separadas de las migraciones SQL.