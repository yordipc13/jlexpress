const deno = (globalThis as typeof globalThis & {
	Deno: {
		env: { get: (name: string) => string | undefined };
		serve: (handler: (request: Request) => Response | Promise<Response>) => void;
	};
}).Deno;

deno.serve(async (request: Request) => {
	if (request.method !== "POST") {
		return Response.json({ error: "Método no permitido." }, { status: 405 });
	}

	const webhookSecret = deno.env.get("WEBHOOK_SECRET");
	if (!webhookSecret || request.headers.get("x-webhook-secret") !== webhookSecret) {
		return Response.json({ error: "No autorizado." }, { status: 401 });
	}

	const resendApiKey = deno.env.get("RESEND_API_KEY");
	const fromEmail = deno.env.get("RESEND_FROM_EMAIL");
	const logoUrl = deno.env.get("EMAIL_LOGO_URL");
	const supabaseUrl = deno.env.get("SUPABASE_URL");
	const serviceRoleKey = deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
	const unsubscribeSecret = deno.env.get("UNSUBSCRIBE_SECRET");

	if (!resendApiKey || !fromEmail || !logoUrl || !supabaseUrl || !serviceRoleKey || !unsubscribeSecret) {
		console.error("Falta configurar uno o más secretos para las notificaciones.");
		return Response.json({ error: "El servicio de correo no está configurado." }, { status: 500 });
	}

	try {
		const payload = await request.json();
		const shipment = payload?.record;
		const previousShipment = payload?.old_record;

		if (payload?.type !== "UPDATE" || payload?.table !== "envios" || !shipment) {
			return Response.json({ skipped: true, reason: "Evento ignorado." });
		}

		const newStatus = String(shipment.estado_envio ?? "").trim();
		const oldStatus = String(previousShipment?.estado_envio ?? "").trim();
		if (!newStatus || newStatus === oldStatus) {
			return Response.json({ skipped: true, reason: "El estado no cambió." });
		}

		const trackingCode = String(shipment.tracking_code ?? "").trim().toUpperCase();
		if (!trackingCode) {
			return Response.json({ skipped: true, reason: "El envío no tiene código de seguimiento." });
		}

		const subscriptionsUrl = new URL("/rest/v1/notificaciones_envio", supabaseUrl);
		subscriptionsUrl.searchParams.set("tracking_code", `ilike.${trackingCode}`);
		subscriptionsUrl.searchParams.set("status", "eq.active");
		subscriptionsUrl.searchParams.set("select", "id,email,cliente_nombre");

		const subscriptionsResponse = await fetch(subscriptionsUrl, {
			headers: {
				apikey: serviceRoleKey,
				Authorization: `Bearer ${serviceRoleKey}`,
			},
		});
		if (!subscriptionsResponse.ok) {
			throw new Error(`No se pudieron consultar las suscripciones (${subscriptionsResponse.status}).`);
		}

		const subscriptions = await subscriptionsResponse.json();
		if (!subscriptions.length) {
			return Response.json({ sent: 0, reason: "No hay suscripciones para este envío." });
		}

		const updateTime = String(shipment.ultima_actualizacion ?? new Date().toISOString());
		const deliveries = await Promise.allSettled(subscriptions.map(async (subscription: {
			id: number | string;
			email: string;
			cliente_nombre: string;
		}) => {
			const customerName = subscription.cliente_nombre.trim() || "cliente";
			const escapedName = escapeHtml(customerName);
			const escapedTrackingCode = escapeHtml(trackingCode);
			const escapedStatus = escapeHtml(newStatus);
			const idempotencyKey = await createIdempotencyKey(trackingCode, updateTime, newStatus, subscription.email);
			const subscriptionId = String(subscription.id);
			const unsubscribeSignature = await signUnsubscribeId(subscriptionId, unsubscribeSecret);
			const unsubscribeUrl = new URL("/functions/v1/manage-tracking-subscription", supabaseUrl);
			unsubscribeUrl.searchParams.set("action", "unsubscribe");
			unsubscribeUrl.searchParams.set("token", `${subscriptionId}.${unsubscribeSignature}`);
			const escapedUnsubscribeUrl = escapeHtml(unsubscribeUrl.toString());

			const emailResponse = await fetch("https://api.resend.com/emails", {
				method: "POST",
				headers: {
					Authorization: `Bearer ${resendApiKey}`,
					"Content-Type": "application/json",
					"Idempotency-Key": idempotencyKey,
				},
				body: JSON.stringify({
					from: `JL Express <${fromEmail}>`,
					to: [subscription.email],
					subject: `Actualización de tu envío ${trackingCode}`,
					html: `
						<div style="margin:0;background:#f3f6fa;padding:32px 16px;font-family:Arial,sans-serif;color:#172334">
							<div style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #dce3eb;border-radius:8px;overflow:hidden">
								<div style="padding:28px 32px;text-align:center;background:#102f55">
									<img src="${escapeHtml(logoUrl)}" alt="JL Express" width="150" style="display:inline-block;max-width:150px;height:auto" />
								</div>
								<div style="padding:28px 32px">
									<p style="margin:0 0 12px;color:#52657a">Hola ${escapedName},</p>
									<h1 style="margin:0 0 20px;font-size:22px;line-height:1.3">Tu envío tiene una actualización</h1>
									<p style="margin:0 0 8px;color:#52657a">Código de seguimiento</p>
									<p style="margin:0 0 20px;font-size:18px;font-weight:700">${escapedTrackingCode}</p>
									<p style="margin:0 0 8px;color:#52657a">Nuevo estado</p>
									<p style="margin:0;padding:14px 16px;border-left:3px solid #e52d45;background:#f5f7fa;font-size:17px;font-weight:700">${escapedStatus}</p>
									<p style="margin:24px 0 0;color:#52657a">Gracias por confiar en JL Express.</p>
									<p style="margin:20px 0 0;color:#52657a;font-size:13px"><a href="${escapedUnsubscribeUrl}" style="color:#123c70">Cancelar estos avisos</a></p>
								</div>
							</div>
						</div>`,
					text: `Hola ${customerName},\n\nTu envío ${trackingCode} tiene un nuevo estado: ${newStatus}.\n\nGracias por confiar en JL Express.\n\nPara cancelar estos avisos: ${unsubscribeUrl.toString()}`,
				}),
			});

			if (!emailResponse.ok) {
				const providerError = await emailResponse.text();
				throw new Error(`Resend rechazó el correo (${emailResponse.status}): ${providerError}`);
			}
		}));

		const failedDeliveries = deliveries.filter((delivery) => delivery.status === "rejected");
		if (failedDeliveries.length) {
			for (const delivery of failedDeliveries) {
				console.error("Falló una notificación de envío:", delivery.reason);
			}
			return Response.json({ sent: deliveries.length - failedDeliveries.length, failed: failedDeliveries.length }, { status: 500 });
		}

		return Response.json({ sent: deliveries.length });
	} catch (error) {
		console.error("No se pudo procesar la actualización de envío:", error);
		return Response.json({ error: "No se pudo procesar la notificación." }, { status: 500 });
	}
});

function escapeHtml(value: string) {
	return value.replace(/[&<>"']/g, (character) => ({
		"&": "&amp;",
		"<": "&lt;",
		">": "&gt;",
		'"': "&quot;",
		"'": "&#39;",
	})[character] ?? character);
}

async function createIdempotencyKey(...parts: string[]) {
	const input = new TextEncoder().encode(parts.join("|"));
	const digest = await crypto.subtle.digest("SHA-256", input);
	return `shipment-${Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("")}`;
}

async function signUnsubscribeId(subscriptionId: string, secret: string) {
	if (new TextEncoder().encode(secret).length < 32) {
		throw new Error("UNSUBSCRIBE_SECRET debe contener al menos 32 bytes.");
	}
	const key = await crypto.subtle.importKey(
		"raw",
		new TextEncoder().encode(secret),
		{ name: "HMAC", hash: "SHA-256" },
		false,
		["sign"],
	);
	const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(subscriptionId));
	return Array.from(new Uint8Array(signature), (byte) => byte.toString(16).padStart(2, "0")).join("");
}
