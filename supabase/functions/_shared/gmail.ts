export type GmailMessage = {
	to: string;
	subject: string;
	text: string;
	html: string;
};

export type GmailConfiguration = {
	clientId: string;
	clientSecret: string;
	refreshToken: string;
	fromEmail: string;
};

const deno = (globalThis as typeof globalThis & {
	Deno: { env: { get: (name: string) => string | undefined } };
}).Deno;

export function getGmailConfiguration(): GmailConfiguration {
	const configuration = {
		clientId: deno.env.get("GMAIL_CLIENT_ID") ?? "",
		clientSecret: deno.env.get("GMAIL_CLIENT_SECRET") ?? "",
		refreshToken: deno.env.get("GMAIL_REFRESH_TOKEN") ?? "",
		fromEmail: deno.env.get("GMAIL_FROM_EMAIL") ?? "",
	};
	if (Object.values(configuration).some((value) => !value) || !isValidEmail(configuration.fromEmail)) {
		throw new Error("Falta configurar Gmail API.");
	}
	return configuration;
}

export async function getGmailAccessToken(configuration: GmailConfiguration) {
	const response = await fetch("https://oauth2.googleapis.com/token", {
		method: "POST",
		headers: { "Content-Type": "application/x-www-form-urlencoded" },
		body: new URLSearchParams({
			client_id: configuration.clientId,
			client_secret: configuration.clientSecret,
			refresh_token: configuration.refreshToken,
			grant_type: "refresh_token",
		}),
	});
	if (!response.ok) {
		console.error("Google rechazó la renovación del token de Gmail:", response.status, await response.text());
		throw new Error("No se pudo autorizar el envío por Gmail.");
	}
	const tokenResponse = await response.json();
	if (typeof tokenResponse.access_token !== "string") {
		throw new Error("Google no devolvió un token de acceso para Gmail.");
	}
	return tokenResponse.access_token as string;
}

export async function sendGmailMessage(accessToken: string, configuration: GmailConfiguration, message: GmailMessage) {
	const boundary = `ji-express-${crypto.randomUUID()}`;
	const mimeMessage = [
		`From: JL Express <${configuration.fromEmail}>`,
		`To: ${message.to}`,
		`Subject: =?UTF-8?B?${encodeBase64(message.subject)}?=`,
		"MIME-Version: 1.0",
		`Content-Type: multipart/alternative; boundary="${boundary}"`,
		"",
		`--${boundary}`,
		"Content-Type: text/plain; charset=UTF-8",
		"Content-Transfer-Encoding: base64",
		"",
		wrapBase64(encodeBase64(message.text)),
		`--${boundary}`,
		"Content-Type: text/html; charset=UTF-8",
		"Content-Transfer-Encoding: base64",
		"",
		wrapBase64(encodeBase64(message.html)),
		`--${boundary}--`,
	].join("\r\n");
	const raw = btoa(mimeMessage).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
	const response = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
		method: "POST",
		headers: {
			Authorization: `Bearer ${accessToken}`,
			"Content-Type": "application/json",
		},
		body: JSON.stringify({ raw }),
	});
	if (!response.ok) {
		console.error("Gmail API rechazó el correo:", response.status, await response.text());
		throw new Error(`Gmail no pudo enviar el correo (${response.status}).`);
	}
}

function encodeBase64(value: string) {
	const bytes = new TextEncoder().encode(value);
	let binary = "";
	for (let offset = 0; offset < bytes.length; offset += 0x8000) {
		binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000));
	}
	return btoa(binary);
}

function wrapBase64(value: string) {
	return value.match(/.{1,76}/g)?.join("\r\n") ?? "";
}

function isValidEmail(email: string) {
	return email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}