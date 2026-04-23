import { json } from "@sveltejs/kit";
import { api } from "$convex/api";
import type { Id } from "$convex/dataModel";
import { env } from "$env/dynamic/private";
import { adminConfig } from "$lib/config/admin";
import { getConvex } from "$lib/server/convexClient";
import type { RequestHandler } from "./$types";

/**
 * Shared secret between this webhook and the Convex mutations it calls.
 * Must be set on both sides (Vercel `WEBHOOK_SECRET` + `npx convex env
 * set WEBHOOK_SECRET`). Audit C4: Convex mutations
 * `requireWebhookCallerOrAuth` and reject on mismatch, so we fail loudly
 * here rather than silently sending unauth'd calls.
 */
function getWebhookSecret(): string {
	const secret = env.WEBHOOK_SECRET;
	if (!secret) {
		throw new Error(
			"WEBHOOK_SECRET is not set — cannot call webhook-gated Convex mutations. Set it in Vercel and run `npx convex env set WEBHOOK_SECRET <value>`.",
		);
	}
	return secret;
}

/**
 * Constant-time string comparison to avoid leaking secret length / prefix
 * via timing. Cheap; the strings involved are small.
 */
function constantTimeEquals(a: string, b: string): boolean {
	if (a.length !== b.length) return false;
	let diff = 0;
	for (let i = 0; i < a.length; i++) {
		diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
	}
	return diff === 0;
}

/**
 * Verify the LumaPrints webhook caller. Audit C9 — previously the handler
 * accepted any POST with a JSON body and trusted the event payload
 * directly, which meant an attacker could forge `shipment.created` events
 * to mark any order shipped with fake tracking.
 *
 * Gate strategy (layered, either passes):
 *   1. `X-Webhook-Signature` header — HMAC-SHA256 of the raw body using
 *      `LUMAPRINTS_WEBHOOK_SIGNING_SECRET`. This matches the standard
 *      pattern Stripe/Resend use; if LumaPrints confirms a header name
 *      that differs, swap the header lookup below.
 *   2. `?token=<secret>` query string — shared token matching
 *      `LUMAPRINTS_WEBHOOK_SECRET`. Weaker than HMAC (replay-able by anyone
 *      who captures one request), but standard for services that don't
 *      sign their payloads, and good enough to shut down drive-by forgery.
 *
 * If neither secret is configured on the deployment, fail closed — we'd
 * rather 401 a legit webhook than accept a forged one.
 */
async function verifyCaller(request: Request, url: URL, rawBody: string): Promise<boolean> {
	const signingSecret = env.LUMAPRINTS_WEBHOOK_SIGNING_SECRET;
	const sharedSecret = env.LUMAPRINTS_WEBHOOK_SECRET;

	if (!signingSecret && !sharedSecret) {
		console.error(
			"[lumaprints webhook] no LUMAPRINTS_WEBHOOK_SIGNING_SECRET or LUMAPRINTS_WEBHOOK_SECRET configured; rejecting",
		);
		return false;
	}

	// 1. HMAC signature header.
	const signatureHeader =
		request.headers.get("x-webhook-signature") || request.headers.get("x-lumaprints-signature");
	if (signingSecret && signatureHeader) {
		const encoder = new TextEncoder();
		const key = await crypto.subtle.importKey(
			"raw",
			encoder.encode(signingSecret),
			{ name: "HMAC", hash: "SHA-256" },
			false,
			["sign"],
		);
		const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(rawBody));
		const expected = Array.from(new Uint8Array(sig))
			.map((b) => b.toString(16).padStart(2, "0"))
			.join("");
		// Accept bare hex or `sha256=<hex>` prefix
		const provided = signatureHeader.replace(/^sha256=/, "");
		if (constantTimeEquals(expected, provided)) return true;
	}

	// 2. Shared query-string token fallback.
	const queryToken = url.searchParams.get("token");
	if (sharedSecret && queryToken) {
		if (constantTimeEquals(queryToken, sharedSecret)) return true;
	}

	return false;
}

export const POST: RequestHandler = async ({ request, url }) => {
	const rawBody = await request.text();

	const authorized = await verifyCaller(request, url, rawBody);
	if (!authorized) {
		console.warn("[lumaprints webhook] unauthorized caller", request.headers.get("user-agent"));
		return json({ error: "Unauthorized" }, { status: 401 });
	}

	let payload: {
		event?: string;
		data?: {
			orderNumber?: string;
			trackingNumber?: string;
			trackingUrl?: string;
			carrier?: string;
		};
	};
	try {
		payload = JSON.parse(rawBody);
	} catch {
		return json({ error: "Invalid JSON" }, { status: 400 });
	}

	// LumaPrints sends webhook events for order status changes
	if (payload.event === "shipment.created") {
		const { orderNumber, trackingNumber, trackingUrl } = payload.data || {};

		if (!orderNumber) {
			console.error("LumaPrints webhook missing orderNumber");
			return json({ error: "Missing orderNumber" }, { status: 400 });
		}

		const convex = getConvex();

		try {
			// The LumaPrints webhook only knows its own orderNumber. Resolve
			// the Convex `_id` via the by_lumaprintsOrderNumber index, then
			// patch tracking on the order. Both calls are webhook-gated via
			// WEBHOOK_SECRET (audit C4).
			const order = await convex.query(api.orders.getByLumaprintsOrderNumber, {
				webhookSecret: getWebhookSecret(),
				siteUrl: adminConfig.siteUrl,
				lumaprintsOrderNumber: orderNumber,
			});

			if (order) {
				await convex.mutation(api.orders.updateStatus, {
					webhookSecret: getWebhookSecret(),
					orderId: order._id as Id<"orders">,
					status: "shipped",
					trackingNumber: trackingNumber || undefined,
					trackingUrl: trackingUrl || undefined,
				});

				// TODO: Send "order shipped" email to customer with tracking info.
				// Audit L5 — this TODO is tracked; land before first real customer.
				console.log(`Order ${orderNumber} marked as shipped. Tracking: ${trackingNumber}`);
			} else {
				console.warn(`LumaPrints webhook: no Convex order found for LumaPrints #${orderNumber}`);
			}
		} catch (err) {
			console.error("Failed to update order from LumaPrints webhook:", err);
			// Return 200 so LumaPrints doesn't retry — we'll handle it manually
		}
	}

	return json({ received: true });
};
