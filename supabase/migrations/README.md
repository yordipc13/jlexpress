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
| `supabase/admin-role-assignment.sql` | Plantilla operativa para asignar un claim `app_metadata.role` a usuarios de Auth y sincronizarlos con `admin_presence`. | Reemplazar el UUID de ejemplo por UUIDs reales. Ejecutar en SQL Editor después de crear `admin_presence`; nunca asigna roles según correo. |
| `Admin/supabase-envios-id-management.sql` | Crea RPC administrativas para borrar envíos y sincronizar la secuencia de `id_excel`. | Requiere `public.envios.id_excel` asociado a una secuencia. Las funciones verifican el claim administrativo. `debug_borrar_envios` elimina todos los envíos; usar con cuidado. |
| `Admin/supabase-route-import-fields.sql` | Crea y protege `public.paquetes_ruta`; si encuentra las 13 columnas esperadas en `envios`, migra los datos de ruta existentes. | Requiere `public.envios`. El backfill se omite si falta cualquiera de esas columnas. |
| `Public/supabase-notifications-setup.sql` | Crea las tablas de suscripción y control de solicitudes, restricciones, índices y RPC para solicitar, confirmar y cancelar avisos. | Requiere `public.envios.tracking_code` y `public.envios.cliente_nombre`. Las RPC se reservan para `service_role`; el cliente web debe pasar por la Edge Function. La solicitud exige consentimiento, crea una suscripción `pending` y limita cada correo a 3 solicitudes por 15 minutos y cada código a 10 por hora. La confirmación vence en 24 horas. |
| `Public/supabase-tracking-function.sql` | Define la RPC pública `consultar_envio`. | Es la misma definición que ya incluye `Public/supabase-rls.sql`; no hace falta ejecutarlo después de ese script salvo para volver a crear la función. |

## Orden de ejecución actual

Antes de aplicar cambios, hacer un respaldo de la base y comprobar que `public.envios` existe con las columnas y secuencia que esperan los scripts. En una instalación existente, comparar primero la migración fechada con las políticas actuales para no volver a aplicar cambios a ciegas. Para una base nueva, obtener el DDL real mediante `supabase db pull` usando acceso autorizado al proyecto y guardarlo como migración inicial antes de aplicar las siguientes. Ejecutar los scripts operativos desde el SQL Editor de Supabase, revisando el resultado de cada paso:

1. Aplicar la migración fechada de acceso después de incorporar el baseline verificado de `public.envios`.
2. Ejecutar `supabase/admin-role-assignment.sql` después de reemplazar el UUID de ejemplo por los UUIDs de Auth autorizados. Los usuarios deben renovar su sesión para recibir el claim actualizado en el JWT.
3. Aplicar `Admin/supabase-envios-id-management.sql` solo si `id_excel` tiene una secuencia asociada.
4. Aplicar `Admin/supabase-route-import-fields.sql`. Comprobar en particular si el bloque de backfill encontró las 13 columnas requeridas.
5. Aplicar `Public/supabase-notifications-setup.sql` para habilitar las suscripciones de notificaciones.
6. Omitir `Public/supabase-tracking-function.sql` si ya se ejecutó la migración de acceso; ambos crean la misma RPC.

Las Edge Functions no se instalan ejecutando SQL. `manage-tracking-subscription` y `send-tracking-update` se despliegan por separado. Configurar en el entorno de funciones `RESEND_API_KEY`, `RESEND_FROM_EMAIL` y `UNSUBSCRIBE_SECRET` (mínimo 32 bytes); `send-tracking-update` también requiere `EMAIL_LOGO_URL` y `WEBHOOK_SECRET`. Supabase proporciona `SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY`. El webhook de cambios de `envios` debe enviar el secreto en el encabezado `x-webhook-secret`. Los correos de actualización incluyen un enlace visible para cancelar; el consentimiento se registra con `consented_at` y solo se envían avisos a suscripciones confirmadas (`active`).

## Pendiente para migraciones versionadas

- Recuperar y documentar desde Supabase el DDL real de `public.envios`, incluidos tipos, valores por defecto, claves, índices y secuencia de `id_excel`.
- Crear la migración inicial de `public.envios` a partir de ese DDL y probarla en una base de desarrollo, sin recrear ni alterar la tabla de producción.
- Convertir los scripts operativos a migraciones numeradas, evitando duplicar `consultar_envio` y probando el orden en una base limpia y otra con datos.
- Registrar el despliegue y la configuración de secretos de las Edge Functions como operaciones separadas de las migraciones SQL.