export {};

const deno = (globalThis as typeof globalThis & {
	Deno: {
		env: { get: (name: string) => string | undefined };
		serve: (handler: (request: Request) => Response | Promise<Response>) => void;
	};
}).Deno;

const corsHeaders = {
	"Access-Control-Allow-Origin": "https://jlexpress.pages.dev",
	"Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
	"Access-Control-Allow-Methods": "POST, OPTIONS",
	Vary: "Origin",
	"Content-Type": "application/json; charset=utf-8",
};

deno.serve(async (request: Request) => {
	const origin = request.headers.get("origin");
	if (origin && origin !== "https://jlexpress.pages.dev") {
		return jsonResponse({ error: "Origen no permitido." }, 403);
	}
	if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
	if (request.method !== "POST") return jsonResponse({ error: "Método no permitido." }, 405);

	try {
		const payload = await request.json();
		const action = payload?.action;
		const trackingCode = typeof payload?.tracking_code === "string"
			? payload.tracking_code.trim().toUpperCase()
			: "";
		const endpoint = typeof payload?.subscription?.endpoint === "string"
			? payload.subscription.endpoint.trim()
			: "";

		if (!isValidTrackingCode(trackingCode) || !isValidEndpoint(endpoint)) {
			return jsonResponse({ error: "El pedido o la suscripción push no son válidos." }, 400);
		}

		const supabaseUrl = deno.env.get("SUPABASE_URL");
		const serviceRoleKey = deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
		if (!supabaseUrl || !serviceRoleKey) {
			console.error("Falta la configuración de Supabase para las suscripciones push.");
			return jsonResponse({ error: "Las notificaciones no están configuradas." }, 500);
		}

		if (action === "unsubscribe") {
			const deleteUrl = new URL("/rest/v1/notificaciones_push", supabaseUrl);
			deleteUrl.searchParams.set("tracking_code", `eq.${trackingCode}`);
			deleteUrl.searchParams.set("endpoint", `eq.${endpoint}`);
			const response = await fetch(deleteUrl, {
				method: "DELETE",
				headers: serviceHeaders(serviceRoleKey),
			});
			if (!response.ok) throw new Error(`No se pudo cancelar la suscripción (${response.status}).`);
			return jsonResponse({ status: "unsubscribed" });
		}

		if (action !== "subscribe") return jsonResponse({ error: "Acción no válida." }, 400);
		const keys = payload?.subscription?.keys;
		const p256dh = typeof keys?.p256dh === "string" ? keys.p256dh : "";
		const auth = typeof keys?.auth === "string" ? keys.auth : "";
		if (!payload?.consent || !isValidPushKey(p256dh) || !isValidPushKey(auth)) {
			return jsonResponse({ error: "Acepta las notificaciones y vuelve a intentarlo." }, 400);
		}

		const shipmentUrl = new URL("/rest/v1/envios", supabaseUrl);
		shipmentUrl.searchParams.set("tracking_code", `ilike.${trackingCode}`);
		shipmentUrl.searchParams.set("select", "tracking_code");
		shipmentUrl.searchParams.set("limit", "1");
		const shipmentResponse = await fetch(shipmentUrl, {
			headers: serviceHeaders(serviceRoleKey),
		});
		if (!shipmentResponse.ok) throw new Error(`No se pudo validar el pedido (${shipmentResponse.status}).`);
		const shipments = await shipmentResponse.json();
		if (!shipments.length) return jsonResponse({ error: "No encontramos un pedido con ese código." }, 404);
		const canonicalTrackingCode = String(shipments[0].tracking_code ?? "").trim().toUpperCase();

		const saveUrl = new URL("/rest/v1/notificaciones_push", supabaseUrl);
		saveUrl.searchParams.set("on_conflict", "tracking_code,endpoint");
		const saveResponse = await fetch(saveUrl, {
			method: "POST",
			headers: {
				...serviceHeaders(serviceRoleKey),
				"Content-Type": "application/json",
				Prefer: "resolution=merge-duplicates,return=minimal",
			},
			body: JSON.stringify({
				tracking_code: canonicalTrackingCode,
				endpoint,
				p256dh,
				auth,
				consented_at: new Date().toISOString(),
			}),
		});
		if (!saveResponse.ok) throw new Error(`No se pudo guardar la suscripción (${saveResponse.status}).`);
		return jsonResponse({ status: "active" });
	} catch (error) {
		console.error("No se pudo procesar la suscripción push:", error);
		return jsonResponse({ error: "No se pudo activar la notificación. Inténtalo de nuevo." }, 500);
	}
});

function serviceHeaders(serviceRoleKey: string) {
	return {
		apikey: serviceRoleKey,
		Authorization: `Bearer ${serviceRoleKey}`,
	};
}

function isValidTrackingCode(value: string) {
	return /^[A-Z0-9_-]{1,100}$/.test(value);
}

function isValidEndpoint(value: string) {
	try {
		const url = new URL(value);
		const allowedPushHost = url.hostname === "fcm.googleapis.com"
			|| url.hostname === "updates.push.services.mozilla.com"
			|| url.hostname === "push.services.mozilla.com"
			|| url.hostname === "web.push.apple.com"
			|| url.hostname === "notify.windows.com"
			|| url.hostname.endsWith(".notify.windows.com");
		return url.protocol === "https:" && !url.port && allowedPushHost && value.length <= 2048;
	} catch {
		return false;
	}
}

function isValidPushKey(value: string) {
	return /^[A-Za-z0-9_-]{16,200}$/.test(value);
}

function jsonResponse(body: Record<string, string>, status = 200) {
	return Response.json(body, { status, headers: corsHeaders });
}