const runtime = globalThis as typeof globalThis & {
  Deno: {
    env: { get(name: string): string | undefined };
    serve(handler: (request: Request) => Response | Promise<Response>): void;
  };
};
const supabaseUrl = runtime.Deno.env.get("SUPABASE_URL")!;
const serviceRoleKey = runtime.Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const resendApiKey = runtime.Deno.env.get("RESEND_API_KEY")!;
const emailFrom = runtime.Deno.env.get("EMAIL_FROM")!;
const webhookSecret = runtime.Deno.env.get("NOTIFICATION_WEBHOOK_SECRET")!;
const logoUrl = "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRndonklgS3Yn9cFRm3AP_8DRMhabAHCRXiYNvRyaHirw&s";
const supabaseHeaders = {
  apikey: serviceRoleKey,
  Authorization: `Bearer ${serviceRoleKey}`,
  "Content-Type": "application/json",
};

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[character]!);
}

function emailTemplate(trackingCode: string, status: string) {
  const safeCode = escapeHtml(trackingCode);
  const safeStatus = escapeHtml(status);
  return `<!doctype html>
<html lang="es">
  <body style="margin:0;padding:24px 12px;background:#f2f5f8;font-family:Arial,Helvetica,sans-serif;color:#172334;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;margin:0 auto;background:#ffffff;border:1px solid #e1e7ee;border-radius:8px;overflow:hidden;">
      <tr><td style="padding:22px 26px;background:#123c70;">
        <table role="presentation" cellspacing="0" cellpadding="0"><tr>
          <td style="padding-right:12px;vertical-align:middle;"><img src="${logoUrl}" width="44" height="44" alt="Logo JL Express" style="display:block;width:44px;height:44px;object-fit:contain;background:#fff;border-radius:8px;"></td>
          <td style="vertical-align:middle;color:#fff;font-size:18px;font-weight:700;letter-spacing:1px;">JL EXPRESS</td>
        </tr></table>
      </td></tr>
      <tr><td style="padding:30px 26px 12px;"><p style="margin:0 0 8px;color:#687386;font-size:12px;font-weight:700;text-transform:uppercase;">Actualización de tu paquete</p><h1 style="margin:0;color:#172334;font-size:24px;line-height:1.3;">Tu envío tiene un nuevo estado</h1></td></tr>
      <tr><td style="padding:12px 26px 28px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border:1px solid #e1e7ee;border-radius:6px;">
          <tr><td style="padding:15px 16px;border-bottom:1px solid #e1e7ee;"><span style="display:block;margin-bottom:6px;color:#687386;font-size:11px;">TRACKING CODE</span><strong style="font-size:15px;overflow-wrap:anywhere;">${safeCode}</strong></td></tr>
          <tr><td style="padding:15px 16px;"><span style="display:block;margin-bottom:6px;color:#687386;font-size:11px;">ESTADO DEL PAQUETE</span><strong style="color:#26704f;font-size:18px;">${safeStatus}</strong></td></tr>
        </table>
        <p style="margin:22px 0 0;color:#687386;font-size:12px;line-height:1.6;">Te enviamos este mensaje porque activaste las notificaciones de seguimiento de JL Express.</p>
      </td></tr>
      <tr><td style="padding:16px 26px;background:#f7f9fb;color:#687386;font-size:11px;line-height:1.6;">JL EXPRESS · Transporte que conecta</td></tr>
    </table>
  </body>
</html>`;
}

runtime.Deno.serve(async (request) => {
  if (request.method !== "POST") return new Response("Method not allowed", { status: 405 });
  if (!webhookSecret || request.headers.get("x-notification-secret") !== webhookSecret) {
    return new Response("Unauthorized", { status: 401 });
  }

  let rowId: number | undefined;
  let attemptCount = 0;
  try {
    const payload = await request.json();
    rowId = Number(payload?.record?.id);
    if (!Number.isSafeInteger(rowId) || rowId <= 0) {
      return new Response("Invalid notification record", { status: 400 });
    }

    const notificationResponse = await fetch(
      `${supabaseUrl}/rest/v1/notification_outbox?id=eq.${rowId}&select=id,tracking_code,email,estado_envio,sent_at,attempts`,
      { headers: supabaseHeaders },
    );
    if (!notificationResponse.ok) throw new Error(`Supabase respondió ${notificationResponse.status}.`);
    const [notification] = await notificationResponse.json();
    if (!notification) throw new Error("No se encontró la notificación solicitada.");
    attemptCount = Number(notification.attempts) || 0;
    if (notification.sent_at) return Response.json({ sent: true, duplicate: true });

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: emailFrom,
        to: [notification.email],
        subject: `JL Express: actualización de tu paquete ${notification.tracking_code}`,
        html: emailTemplate(notification.tracking_code, notification.estado_envio),
      }),
    });
    if (!response.ok) throw new Error(`Resend respondió ${response.status}: ${await response.text()}`);

    const updateResponse = await fetch(
      `${supabaseUrl}/rest/v1/notification_outbox?id=eq.${rowId}`,
      {
        method: "PATCH",
        headers: { ...supabaseHeaders, Prefer: "return=minimal" },
        body: JSON.stringify({ sent_at: new Date().toISOString(), last_error: null }),
      },
    );
    if (!updateResponse.ok) throw new Error(`No se pudo marcar el correo como enviado (${updateResponse.status}).`);
    return Response.json({ sent: true });
  } catch (error) {
    if (rowId) {
      await fetch(`${supabaseUrl}/rest/v1/notification_outbox?id=eq.${rowId}`, {
        method: "PATCH",
        headers: { ...supabaseHeaders, Prefer: "return=minimal" },
        body: JSON.stringify({ attempts: attemptCount + 1, last_error: String(error) }),
      });
    }
    console.error("No se pudo enviar la notificación de tracking", error);
    return new Response("Notification delivery failed", { status: 500 });
  }
});