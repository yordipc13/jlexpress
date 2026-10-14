import webpush from "npm:web-push@3.6.7";

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

	const supabaseUrl = deno.env.get("SUPABASE_URL");
	const serviceRoleKey = deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
	const vapidPublicKey = deno.env.get("VAPID_PUBLIC_KEY");
	const vapidPrivateKey = deno.env.get("VAPID_PRIVATE_KEY");	
	const vapidSubject = deno.env.get("VAPID_SUBJECT") || "mailto:jlexpressmensajeriaturri@gmail.com";
	if (!supabaseUrl || !serviceRoleKey || !vapidPublicKey || !vapidPrivateKey) {
		console.error("Falta configurar Supabase o las claves VAPID para notificaciones push.");
		return Response.json({ error: "El servicio push no está configurado." }, { status: 500 });
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
		if (!trackingCode) return Response.json({ skipped: true, reason: "Falta el código de seguimiento." });

		const subscriptionsUrl = new URL("/rest/v1/notificaciones_push", supabaseUrl);
		subscriptionsUrl.searchParams.set("tracking_code", `eq.${trackingCode}`);
		subscriptionsUrl.searchParams.set("select", "id,endpoint,p256dh,auth");
		const subscriptionsResponse = await fetch(subscriptionsUrl, {
			headers: serviceHeaders(serviceRoleKey),
		});
		if (!subscriptionsResponse.ok) {
			throw new Error(`No se pudieron consultar las suscripciones (${subscriptionsResponse.status}).`);
		}

		const subscriptions = await subscriptionsResponse.json();
		if (!subscriptions.length) return Response.json({ sent: 0, reason: "No hay suscripciones push para este pedido." });

		webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);
		const updateTime = String(shipment.ultima_actualizacion ?? new Date().toISOString());
		const updatedAt = formatUpdateTime(updateTime);
		const pushPayload = JSON.stringify({
			title: "JL Express: cambio en tu pedido",
			body: `${trackingCode}: ${oldStatus || "Estado anterior no disponible"} → ${newStatus}. Actualizado ${updatedAt}.`,
			tag: `shipment-${trackingCode}`,
			url: `/?tracking=${encodeURIComponent(trackingCode)}#panel-servicios`,
		});

		const deliveries = await Promise.allSettled(subscriptions.map((subscription: {
			id: number | string;
			endpoint: string;
			p256dh: string;
			auth: string;
		}) => webpush.sendNotification({
			endpoint: subscription.endpoint,
			keys: { p256dh: subscription.p256dh, auth: subscription.auth },
		}, pushPayload, { TTL: 86400 })));

		const failedDeliveries = deliveries.flatMap((delivery, index) => {
			if (delivery.status === "fulfilled") return [];
			const statusCode = Number((delivery.reason as { statusCode?: number })?.statusCode);
			if (statusCode === 404 || statusCode === 410) {
				return [removeExpiredSubscription(subscriptions[index].id, supabaseUrl, serviceRoleKey)];
			}
			console.error("Falló una notificación push:", statusCode || "error de entrega");
			return [Promise.resolve()];
		});
		await Promise.all(failedDeliveries);

		const expiredCount = deliveries.filter((delivery) => delivery.status === "rejected"
			&& [404, 410].includes(Number((delivery.reason as { statusCode?: number })?.statusCode))).length;
		const failedCount = deliveries.filter((delivery) => delivery.status === "rejected").length - expiredCount;
		const sentCount = deliveries.length - failedCount - expiredCount;
		return Response.json({ sent: sentCount, failed: failedCount, expired: expiredCount }, {
			status: failedCount ? 502 : 200,
		});
	} catch (error) {
		console.error("No se pudo procesar el cambio de estado para push:", error);
		return Response.json({ error: "No se pudo enviar la actualización push." }, { status: 500 });
	}
});

function serviceHeaders(serviceRoleKey: string) {
	return {
		apikey: serviceRoleKey,
		Authorization: `Bearer ${serviceRoleKey}`,
	};
}

async function removeExpiredSubscription(id: number | string, supabaseUrl: string, serviceRoleKey: string) {
	const deleteUrl = new URL("/rest/v1/notificaciones_push", supabaseUrl);
	deleteUrl.searchParams.set("id", `eq.${id}`);
	const response = await fetch(deleteUrl, {
		method: "DELETE",
		headers: serviceHeaders(serviceRoleKey),
	});
	if (!response.ok) console.error("No se pudo eliminar una suscripción push vencida.");
}

function formatUpdateTime(value: string) {
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return value;
	return new Intl.DateTimeFormat("es-CR", {
		dateStyle: "long",
		timeStyle: "short",
		timeZone: "America/Costa_Rica",
	}).format(date);
}