const deno = (globalThis as typeof globalThis & {
	Deno: {
		env: { get: (name: string) => string | undefined };
		serve: (handler: (request: Request) => Response | Promise<Response>) => void;
	};
}).Deno;

export {};

const corsHeaders = {
	"Access-Control-Allow-Origin": "*",
	"Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
	"Access-Control-Allow-Methods": "GET, POST, OPTIONS",
	"Content-Type": "application/json; charset=utf-8",
};

deno.serve(async (request: Request) => {
	if (request.method === "OPTIONS") {
		return new Response("ok", { headers: corsHeaders });
	}

	try {
		if (request.method === "POST") {
			const action = new URL(request.url).searchParams.get("action");
			if (action === "unsubscribe") return await handleUnsubscribe(request);
			if (action === "confirm") return await handleConfirm(request);
			if (action !== "subscribe") return jsonResponse({ error: "Acción no válida." }, 400);
			return await handleSubscribe(request);
		}

		if (request.method === "GET") {
			return await handleLink(request);
		}

		return jsonResponse({ error: "Método no permitido." }, 405);
	} catch (error) {
		if (error instanceof Error && error.message === "rate_limit") {
			return jsonResponse({ error: "Has realizado varias solicitudes. Inténtalo más tarde." }, 429);
		}
		if (error instanceof Error && error.message === "tracking_not_found") {
			return jsonResponse({ error: "No encontramos un envío con ese código." }, 404);
		}
		console.error("No se pudo procesar la suscripción de avisos:", error);
		return jsonResponse({ error: "No se pudo procesar la solicitud. Inténtalo más tarde." }, 500);
	}
});

async function handleSubscribe(request: Request) {
	let payload: Record<string, unknown>;
	try {
		payload = await request.json();
	} catch {
		return jsonResponse({ error: "Solicitud inválida." }, 400);
	}

	const trackingCode = typeof payload.tracking_code === "string" ? payload.tracking_code.trim().toUpperCase() : "";
	const email = typeof payload.email === "string" ? payload.email.trim().toLowerCase() : "";
	if (payload.action !== "subscribe" || payload.consent !== true || !trackingCode || trackingCode.length > 100 || !isValidEmail(email)) {
		return jsonResponse({ error: "Revisa el código, el correo y el consentimiento." }, 400);
	}

	const resendApiKey = deno.env.get("RESEND_API_KEY");
	const fromEmail = deno.env.get("RESEND_FROM_EMAIL");
	const supabaseUrl = deno.env.get("SUPABASE_URL");
	const serviceRoleKey = deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
	if (!resendApiKey || !fromEmail || !supabaseUrl || !serviceRoleKey) {
		console.error("Falta configurar uno o más secretos para la confirmación de avisos.");
		return jsonResponse({ error: "El servicio de correo no está configurado." }, 500);
	}

	const confirmationToken = createToken();
	const confirmationTokenHash = await hashToken(confirmationToken);
	const result = await callRpc("solicitar_suscripcion_notificaciones", {
		p_tracking_code: trackingCode,
		p_email: email,
		p_consent: true,
		p_confirmation_token_hash: confirmationTokenHash,
	});

	if (result === "already_active") {
		return jsonResponse({ status: "already_active", message: "La suscripción ya está activa." });
	}

	const confirmationUrl = createActionUrl(supabaseUrl, "confirm", confirmationToken);
	const emailResponse = await fetch("https://api.resend.com/emails", {
		method: "POST",
		headers: {
			Authorization: `Bearer ${resendApiKey}`,
			"Content-Type": "application/json",
			"Idempotency-Key": `tracking-confirmation-${confirmationTokenHash}`,
		},
		body: JSON.stringify({
			from: `JL Express <${fromEmail}>`,
			to: [email],
			subject: "Confirma los avisos de tu envío | JL Express",
			html: `
				<div style="margin:0;background:#f3f6fa;padding:32px 16px;font-family:Arial,sans-serif;color:#172334">
					<div style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #dce3eb;border-radius:8px;padding:32px">
						<h1 style="margin:0 0 16px;font-size:22px">Confirma tu suscripción</h1>
						<p style="margin:0 0 24px;line-height:1.6">Para recibir avisos sobre los cambios de estado de tu envío, confirma que esta dirección de correo es tuya.</p>
						<a href="${escapeHtml(confirmationUrl)}" style="display:inline-block;padding:12px 18px;background:#123c70;color:#ffffff;text-decoration:none;border-radius:6px;font-weight:700">Confirmar correo</a>
						<p style="margin:24px 0 0;color:#52657a;font-size:13px">Si no solicitaste estos avisos, ignora este mensaje. El enlace vence en 24 horas.</p>
					</div>
				</div>`,
			text: `Confirma tu suscripción a los avisos de JL Express abriendo este enlace: ${confirmationUrl}\n\nSi no solicitaste estos avisos, ignora este mensaje. El enlace vence en 24 horas.`,
		}),
	});

	if (!emailResponse.ok) {
		console.error("Resend rechazó el correo de confirmación:", emailResponse.status, await emailResponse.text());
		return jsonResponse({ error: "No se pudo enviar el correo de confirmación. Inténtalo más tarde." }, 502);
	}

	return jsonResponse({ status: "pending", message: "Revisa tu correo para confirmar la suscripción." });
}

async function handleLink(request: Request) {
	const url = new URL(request.url);
	const action = url.searchParams.get("action");
	const token = url.searchParams.get("token") ?? "";
	if (action === "confirm") {
		if (!/^[a-f0-9]{64}$/.test(token)) {
			return htmlResponse(renderResult("Enlace inválido", "El enlace no es válido o ya venció."), 400);
		}
		return htmlResponse(renderConfirmationPage(token), 200, true);
	}

	if (action !== "unsubscribe") {
		return htmlResponse(renderResult("Enlace inválido", "No reconocemos esta acción."), 400);
	}

	if (!(await isValidUnsubscribeToken(token))) {
		return htmlResponse(renderResult("Enlace inválido", "El enlace no es válido."), 400);
	}

	return htmlResponse(renderUnsubscribeConfirmation(token), 200, true);
}

async function handleUnsubscribe(request: Request) {
	const form = await request.formData();
	const token = String(form.get("token") ?? "");
	const match = /^(\d+)\.([a-f0-9]{64})$/.exec(token);
	if (!match || !(await isValidUnsubscribeToken(token))) {
		return htmlResponse(renderResult("Enlace inválido", "El enlace no es válido."), 400);
	}

	const cancelled = await callRpc("cancelar_suscripcion_notificaciones", { p_subscription_id: match[1] });
	if (cancelled !== true) {
		return htmlResponse(renderResult("No se pudo completar", "La suscripción ya fue cancelada o el enlace no es válido."), 400);
	}
	return htmlResponse(renderResult("Avisos cancelados", "Ya no recibirás correos de actualización para este envío."));
}

async function handleConfirm(request: Request) {
	const form = await request.formData();
	const token = String(form.get("token") ?? "");
	if (!/^[a-f0-9]{64}$/.test(token)) {
		return htmlResponse(renderResult("Enlace inválido", "El enlace no es válido o ya venció."), 400);
	}

	const confirmed = await callRpc("confirmar_suscripcion_notificaciones", { p_token_hash: await hashToken(token) });
	if (confirmed !== true) {
		return htmlResponse(renderResult("No se pudo completar", "El enlace venció o ya fue utilizado. Puedes solicitar una nueva confirmación desde el rastreo."), 400);
	}
	return htmlResponse(renderResult("Suscripción confirmada", "Te enviaremos un correo cuando cambie el estado de tu envío."));
}

async function callRpc(name: string, body: Record<string, unknown>) {
	const supabaseUrl = deno.env.get("SUPABASE_URL");
	const serviceRoleKey = deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
	if (!supabaseUrl || !serviceRoleKey) throw new Error("Faltan los secretos de Supabase.");

	const response = await fetch(new URL(`/rest/v1/rpc/${name}`, supabaseUrl), {
		method: "POST",
		headers: {
			apikey: serviceRoleKey,
			Authorization: `Bearer ${serviceRoleKey}`,
			"Content-Type": "application/json",
		},
		body: JSON.stringify(body),
	});
	const responseText = await response.text();
	if (!response.ok) {
		if (responseText.toLowerCase().includes("demasiadas solicitudes")) {
			throw new Error("rate_limit");
		}
		if (responseText.toLowerCase().includes("no encontramos un envío")) {
			throw new Error("tracking_not_found");
		}
		throw new Error(`La operación de base de datos falló (${response.status}).`);
	}
	return responseText ? JSON.parse(responseText) : null;
}

function jsonResponse(body: Record<string, string>, status = 200) {
	return Response.json(body, { status, headers: corsHeaders });
}

function htmlResponse(content: string, status = 200, allowForm = false) {
	return new Response(content, {
		status,
		headers: {
			"Content-Type": "text/html; charset=utf-8",
			"Content-Security-Policy": `default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action ${allowForm ? "'self'" : "'none'"}; frame-ancestors 'none'`,
			"X-Content-Type-Options": "nosniff",
			"Referrer-Policy": "no-referrer",
		},
	});
}

function renderResult(heading: string, message: string) {
	return `<!doctype html><html lang="es"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${heading} | JL Express</title><body style="margin:0;padding:32px 16px;background:#f3f6fa;color:#172334;font:16px Arial,sans-serif"><main style="max-width:560px;margin:8vh auto;padding:32px;background:#fff;border:1px solid #dce3eb;border-radius:8px"><h1 style="font-size:22px">${heading}</h1><p style="line-height:1.6">${message}</p><p>JL Express</p></main></body></html>`;
}

function createActionUrl(supabaseUrl: string, action: string, token: string) {
	const url = new URL("/functions/v1/manage-tracking-subscription", supabaseUrl);
	url.searchParams.set("action", action);
	url.searchParams.set("token", token);
	return url.toString();
}

function createToken() {
	const bytes = crypto.getRandomValues(new Uint8Array(32));
	return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function hashToken(token: string) {
	const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
	return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function isValidEmail(email: string) {
	return email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function escapeHtml(value: string) {
	return value.replace(/[&<>"']/g, (character) => ({
		"&": "&amp;",
		"<": "&lt;",
		">": "&gt;",
		'"': "&quot;",
		"'": "&#39;",
	})[character] ?? character);
}

async function verifyUnsubscribeSignature(subscriptionId: string, signature: string, secret: string) {
	if (new TextEncoder().encode(secret).length < 32) return false;
	const key = await crypto.subtle.importKey(
		"raw",
		new TextEncoder().encode(secret),
		{ name: "HMAC", hash: "SHA-256" },
		false,
		["verify"],
	);
	const signatureBytes = Uint8Array.from(signature.match(/.{2}/g) ?? [], (byte) => Number.parseInt(byte, 16));
	return crypto.subtle.verify("HMAC", key, signatureBytes, new TextEncoder().encode(subscriptionId));
}

function renderUnsubscribeConfirmation(token: string) {
	return `<!doctype html><html lang="es"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Cancelar avisos | JL Express</title><body style="margin:0;padding:32px 16px;background:#f3f6fa;color:#172334;font:16px Arial,sans-serif"><main style="max-width:560px;margin:8vh auto;padding:32px;background:#fff;border:1px solid #dce3eb;border-radius:8px"><h1 style="font-size:22px">¿Cancelar estos avisos?</h1><p style="line-height:1.6">Dejarás de recibir correos cuando cambie el estado de este envío.</p><form method="post" action="?action=unsubscribe"><input type="hidden" name="token" value="${token}"><button type="submit" style="padding:12px 18px;background:#123c70;color:#fff;border:0;border-radius:6px;font-weight:700;cursor:pointer">Confirmar cancelación</button></form></main></body></html>`;
}

function renderConfirmationPage(token: string) {
	return `<!doctype html><html lang="es"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Confirmar avisos | JL Express</title><body style="margin:0;padding:32px 16px;background:#f3f6fa;color:#172334;font:16px Arial,sans-serif"><main style="max-width:560px;margin:8vh auto;padding:32px;background:#fff;border:1px solid #dce3eb;border-radius:8px"><h1 style="font-size:22px">Confirma los avisos de tu envío</h1><p style="line-height:1.6">Al confirmar, aceptas recibir correos cuando cambie el estado de este envío.</p><form method="post" action="?action=confirm"><input type="hidden" name="token" value="${token}"><button type="submit" style="padding:12px 18px;background:#123c70;color:#fff;border:0;border-radius:6px;font-weight:700;cursor:pointer">Confirmar suscripción</button></form></main></body></html>`;
}

async function isValidUnsubscribeToken(token: string) {
	const match = /^(\d+)\.([a-f0-9]{64})$/.exec(token);
	const secret = deno.env.get("UNSUBSCRIBE_SECRET");
	return Boolean(match && secret && await verifyUnsubscribeSignature(match[1], match[2], secret));
}