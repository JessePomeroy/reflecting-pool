// LumaPrints API client — server-only
// See LUMAPRINTS.md for full spec and known issues

import {
	LUMAPRINTS_API_KEY,
	LUMAPRINTS_API_SECRET,
	LUMAPRINTS_STORE_ID,
	LUMAPRINTS_USE_SANDBOX,
} from "$env/static/private";
import type {
	LumaPrintsOrder,
	LumaPrintsOrderResponse,
	LumaPrintsShipment,
	OrderItem,
	Recipient,
} from "$lib/shop/types";

// Sandbox switch is driven by an explicit LUMAPRINTS_USE_SANDBOX env var
// instead of `import.meta.env.DEV`. The Vite DEV flag is true only for
// `pnpm dev` and leaves Vercel preview deployments pointing at production
// LumaPrints — a silent footgun for any PR touching checkout. An explicit
// var lets each environment (local / preview / production) be configured
// independently. See LUMAPRINTS.md for the recommended Vercel config.
const BASE_URL =
	LUMAPRINTS_USE_SANDBOX === "true"
		? "https://us.api-sandbox.lumaprints.com"
		: "https://us.api.lumaprints.com";

function getHeaders(): HeadersInit {
	return {
		"Content-Type": "application/json",
		Authorization: `Basic ${btoa(`${LUMAPRINTS_API_KEY}:${LUMAPRINTS_API_SECRET}`)}`,
	};
}

/**
 * CRITICAL: Strip ALL query params from Sanity image URLs before sending to LumaPrints.
 * Query params (?w=1200&fm=webp) cause aspect ratio validation errors.
 * The raw Sanity CDN URL serves JPEG by default — no format param needed.
 */
export function cleanImageUrl(url: string): string {
	return url.split("?")[0];
}

/** Custom error class with LumaPrints API details */
export class LumaPrintsError extends Error {
	details: unknown;
	constructor(message: string, details?: unknown) {
		super(message);
		this.name = "LumaPrintsError";
		this.details = details;
	}
}

/** Submit an order to LumaPrints */
export async function createOrder(order: LumaPrintsOrder): Promise<LumaPrintsOrderResponse> {
	const res = await fetch(`${BASE_URL}/api/v1/orders`, {
		method: "POST",
		headers: getHeaders(),
		body: JSON.stringify(order),
	});

	if (!res.ok) {
		const error = await res.json().catch(() => ({ message: res.statusText }));
		throw new LumaPrintsError("Order submission failed", error);
	}

	return res.json();
}

/** Get order status from LumaPrints */
export async function getOrder(
	orderNumber: string,
): Promise<{ orderNumber: string; status: string }> {
	const res = await fetch(`${BASE_URL}/api/v1/orders/${orderNumber}`, {
		headers: getHeaders(),
	});
	if (!res.ok) {
		throw new LumaPrintsError(`Failed to get order ${orderNumber}`);
	}
	return res.json();
}

/** Get shipment tracking for an order */
export async function getShipping(orderNumber: string): Promise<LumaPrintsShipment[]> {
	const res = await fetch(`${BASE_URL}/api/v1/orders/${orderNumber}/shipments`, {
		headers: getHeaders(),
	});
	if (!res.ok) {
		throw new LumaPrintsError(`Failed to get shipments for ${orderNumber}`);
	}
	return res.json();
}

/** Validate an image for a given size before ordering */
export async function validateImage(
	imageUrl: string,
	width: number,
	height: number,
	subcategoryId = 103001,
): Promise<{ valid: boolean; message?: string }> {
	const res = await fetch(`${BASE_URL}/api/v1/images/check`, {
		method: "POST",
		headers: getHeaders(),
		body: JSON.stringify({
			imageUrl: cleanImageUrl(imageUrl),
			width,
			height,
			subcategoryId,
		}),
	});
	return res.json();
}

/** Get shipping price estimate */
export async function getShippingPrice(
	items: { subcategoryId: number; width: number; height: number; quantity: number }[],
	destination: { country: string; state: string; zipCode: string },
): Promise<{ price: number; currency: string }> {
	const res = await fetch(`${BASE_URL}/api/v1/pricing/shipping`, {
		method: "POST",
		headers: getHeaders(),
		body: JSON.stringify({
			storeId: Number(LUMAPRINTS_STORE_ID),
			shippingMethod: "default",
			recipient: destination,
			orderItems: items,
		}),
	});
	return res.json();
}

/**
 * Build a LumaPrints order payload from our domain types.
 * CRITICAL constraints:
 * - cleanImageUrl() strips query params from all image URLs
 * - ALWAYS uses option 39 (No Bleed) — never option 36
 */
export function buildLumaPrintsOrder(
	externalId: string,
	recipient: Recipient,
	items: OrderItem[],
): LumaPrintsOrder {
	return {
		externalId,
		storeId: Number(LUMAPRINTS_STORE_ID),
		shippingMethod: "default",
		recipient: {
			firstName: recipient.firstName,
			lastName: recipient.lastName,
			addressLine1: recipient.address1,
			addressLine2: recipient.address2 || "",
			city: recipient.city,
			state: recipient.state,
			zipCode: recipient.zip,
			country: recipient.country,
			phone: recipient.phone || "",
		},
		orderItems: items.map((item, i) => ({
			externalItemId: `${externalId}-item-${i + 1}`,
			subcategoryId: item.paperSubcategoryId,
			quantity: item.quantity,
			width: item.width,
			height: item.height,
			file: {
				imageUrl: cleanImageUrl(item.imageUrl), // CRITICAL: strip query params
			},
			orderItemOptions: [39], // ALWAYS No Bleed (option 39)
		})),
	};
}
