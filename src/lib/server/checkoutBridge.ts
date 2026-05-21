import { createHmac } from "node:crypto";
import { env } from "$env/dynamic/private";
import type { CheckoutMetadata } from "$lib/shop/types";

const DEFAULT_CHECKOUT_BRIDGE_PATH = "/api/tenant-checkout/print";

interface HubPrintCheckoutParams {
	siteUrl: string;
	amountCents: number;
	productName: string;
	productDescription: string;
	imageUrl: string;
	metadata: CheckoutMetadata;
	successUrl: string;
	cancelUrl: string;
	fetcher?: typeof fetch;
	now?: number;
}

export interface HubPrintCheckoutResult {
	sessionId: string;
	url: string | null;
	platformFeeAmount: number;
}

export class CheckoutBridgeError extends Error {
	status: number;

	constructor(status: number, message: string) {
		super(message);
		this.name = "CheckoutBridgeError";
		this.status = status;
	}
}

export async function createHubPrintCheckoutSession({
	siteUrl,
	amountCents,
	productName,
	productDescription,
	imageUrl,
	metadata,
	successUrl,
	cancelUrl,
	fetcher = fetch,
	now = Date.now(),
}: HubPrintCheckoutParams): Promise<HubPrintCheckoutResult> {
	const secret = getCheckoutBridgeSecret();
	const bodyText = JSON.stringify({
		siteUrl,
		amountCents,
		productName,
		productDescription,
		imageUrl,
		metadata,
		successUrl,
		cancelUrl,
	});
	const timestamp = now;
	const signature = signCheckoutBridgeBody({ bodyText, secret, timestamp });

	const response = await fetcher(getCheckoutBridgeEndpoint(), {
		method: "POST",
		headers: {
			"content-type": "application/json",
			"x-checkout-bridge-signature": signature,
			"x-checkout-bridge-timestamp": String(timestamp),
		},
		body: bodyText,
	});

	if (!response.ok) {
		const message = await response.text();
		throw new CheckoutBridgeError(response.status, message || "Checkout bridge request failed");
	}

	return (await response.json()) as HubPrintCheckoutResult;
}

export function signCheckoutBridgeBody({
	bodyText,
	secret,
	timestamp,
}: {
	bodyText: string;
	secret: string;
	timestamp: number;
}): string {
	return createHmac("sha256", secret).update(`${timestamp}.${bodyText}`).digest("hex");
}

function getCheckoutBridgeEndpoint(): string {
	const raw = env.CHECKOUT_BRIDGE_URL;
	if (!raw) {
		throw new CheckoutBridgeError(500, "CHECKOUT_BRIDGE_URL is not configured");
	}

	const endpoint = new URL(raw);
	if (endpoint.pathname === "/" || endpoint.pathname === "") {
		endpoint.pathname = DEFAULT_CHECKOUT_BRIDGE_PATH;
	}
	return endpoint.toString();
}

function getCheckoutBridgeSecret(): string {
	const secret = env.CHECKOUT_BRIDGE_SECRET;
	if (!secret) {
		throw new CheckoutBridgeError(500, "CHECKOUT_BRIDGE_SECRET is not configured");
	}
	return secret;
}
