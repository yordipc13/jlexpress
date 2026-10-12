# Configuración de avisos de seguimiento

Los avisos requieren desplegar el SQL de notificaciones añadido al final de `supabase-rls.sql`, publicar la función Edge y conectar un webhook de base de datos. La clave de Resend y la clave de servicio de Supabase nunca se colocan en el sitio público.

1. En Supabase SQL Editor, ejecuta el bloque de notificaciones del final de `supabase-rls.sql`.
2. Verifica un dominio de envío en Resend y configura los secretos:

   ```powershell
   supabase secrets set RESEND_API_KEY="re_..." EMAIL_FROM="JL Express <notificaciones@tu-dominio.com>" NOTIFICATION_WEBHOOK_SECRET="un-secreto-largo-aleatorio"
   ```

3. Desde la carpeta `JI Express`, despliega la función:

   ```powershell
   supabase functions deploy send-tracking-update
   ```

4. En Supabase Dashboard, crea un Database Webhook para `public.notification_outbox`, evento `INSERT`, método `POST`, con URL `https://swpvtfjbseftynnhflfi.supabase.co/functions/v1/send-tracking-update`. Añade los encabezados `Content-Type: application/json` y `x-notification-secret` con el mismo secreto del paso 2.

Tras esta configuración, el visitante puede aceptar el aviso desde el resultado del rastreo y cada cambio real de `estado_envio` genera un correo con la marca JL Express, el tracking code y el nuevo estado.