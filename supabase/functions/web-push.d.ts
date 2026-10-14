declare module "npm:web-push@3.6.7" {
	interface PushSubscription {
		endpoint: string;
		keys: { p256dh: string; auth: string };
	}

	interface WebPush {
		setVapidDetails(subject: string, publicKey: string, privateKey: string): void;
		sendNotification(
			subscription: PushSubscription,
			payload: string,
			options?: { TTL?: number },
		): Promise<unknown>;
	}

	const webpush: WebPush;
	export default webpush;
}