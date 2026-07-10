import { json } from "@sveltejs/kit";
import { Resend } from "resend";
import { api } from "$convex/api";
import { env } from "$env/dynamic/private";
import { adminConfig } from "$lib/config/admin";
import { getConvex } from "$lib/server/convexClient";
import { escapeHtml } from "$lib/server/html";
import type { RequestHandler } from "./$types";

const resend = env.RESEND_API_KEY ? new Resend(env.RESEND_API_KEY) : null;
const FROM_EMAIL = env.FROM_EMAIL || adminConfig.fromEmail;

type ShipmentEmailDeliveryResult =
	| { status: "sent" }
	| { status: "failed"; error: string }
	| { status: "skipped"; error?: string };

/**
 * Shared secret between this webhook and the Convex mutations it calls.
 * Must be set on both sides (Vercel `WEBHOOK_SECRET` + `npx convex env
 * set WEBHOOK_SECRET`). Convex mutations call
 * `requireWebhookCallerOrAuth` and reject on mismatch, so this route fails
 * loudly rather than silently sending unauthenticated calls.
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

function getErrorMessage(err: unknown): string {
	if (err instanceof Error) return err.message;
	if (typeof err === "string") return err;
	return "";
}

function isRetryableConvexShipmentClaimFailure(err: unknown): boolean {
	const message = getErrorMessage(err).toLowerCase();
	if (!message) return false;

	const referencesShipmentClaim = message.includes("claimshipmentemailnotification");
	const looksLikeMissingFunction =
		message.includes("could not find") ||
		message.includes("not found") ||
		message.includes("no such function") ||
		message.includes("functionnotfound");

	if (referencesShipmentClaim && looksLikeMissingFunction) return true;

	return (
		message.includes("fetch failed") ||
		message.includes("network error") ||
		message.includes("connection timeout") ||
		message.includes("request timed out")
	);
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
 * Verify the LumaPrints webhook caller before trusting shipment data that
 * can change order state and trigger customer email.
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
			const webhookSecret = getWebhookSecret();
			// The LumaPrints webhook only knows its own orderNumber. Convex owns
			// the lookup, tracking/status patch, and one-time email claim in a
			// single transaction so concurrent webhook deliveries cannot double
			// email the customer.
			const claim = await convex.mutation(api.orders.claimShipmentEmailNotification, {
				webhookSecret,
				siteUrl: adminConfig.siteUrl,
				lumaprintsOrderNumber: orderNumber,
				trackingNumber: trackingNumber || undefined,
				trackingUrl: trackingUrl || undefined,
			});

			if (claim) {
				if (claim.claimed) {
					const delivery = await sendShipmentEmail({
						customerEmail: claim.order.customerEmail,
						orderNumber: claim.order.orderNumber,
						lumaprintsOrderNumber: orderNumber,
						trackingNumber,
						trackingUrl,
					});
					await recordShipmentEmailDelivery({
						convex,
						webhookSecret,
						lumaprintsOrderNumber: orderNumber,
						delivery,
					});
				}
				console.log(`Order ${orderNumber} marked as shipped. Tracking: ${trackingNumber}`);
			} else {
				console.warn(`LumaPrints webhook: no Convex order found for LumaPrints #${orderNumber}`);
			}
		} catch (err) {
			console.error("Failed to update order from LumaPrints webhook:", err);
			if (isRetryableConvexShipmentClaimFailure(err)) {
				return json({ error: "Shipment processing temporarily unavailable" }, { status: 503 });
			}
			// Return 200 so LumaPrints doesn't retry — we'll handle it manually
		}
	}

	return json({ received: true });
};

async function recordShipmentEmailDelivery({
	convex,
	webhookSecret,
	lumaprintsOrderNumber,
	delivery,
}: {
	convex: ReturnType<typeof getConvex>;
	webhookSecret: string;
	lumaprintsOrderNumber: string;
	delivery: ShipmentEmailDeliveryResult;
}) {
	try {
		await convex.mutation(api.orders.recordShipmentEmailDelivery, {
			webhookSecret,
			siteUrl: adminConfig.siteUrl,
			lumaprintsOrderNumber,
			status: delivery.status,
			error:
				delivery.status === "failed" || delivery.status === "skipped" ? delivery.error : undefined,
		});
	} catch (err) {
		console.error("Failed to record LumaPrints shipment email delivery state:", err);
	}
}

async function sendShipmentEmail({
	customerEmail,
	orderNumber,
	lumaprintsOrderNumber,
	trackingNumber,
	trackingUrl,
}: {
	customerEmail?: string;
	orderNumber?: string;
	lumaprintsOrderNumber: string;
	trackingNumber?: string;
	trackingUrl?: string;
}): Promise<ShipmentEmailDeliveryResult> {
	if (!customerEmail) return { status: "skipped", error: "Order has no customer email" };
	if (!resend) return { status: "skipped", error: "RESEND_API_KEY is not configured" };

	const displayOrderNumber = orderNumber || lumaprintsOrderNumber;
	const safeTrackingUrl = getSafeTrackingUrl(trackingUrl);
	const trackingMarkup = trackingUrl
		? safeTrackingUrl
			? `<p><a href="${escapeHtml(safeTrackingUrl)}">track your shipment</a></p>`
			: `<p><strong>tracking link:</strong> ${escapeHtml(trackingUrl)}</p>`
		: trackingNumber
			? `<p><strong>tracking:</strong> ${escapeHtml(trackingNumber)}</p>`
			: "<p>Your print has shipped. Tracking details should update soon.</p>";

	try {
		const result = await resend.emails.send({
			from: FROM_EMAIL,
			to: customerEmail,
			subject: `your reflecting pool order ${displayOrderNumber} has shipped`,
			html: `
				<p>Hi there,</p>
				<p>Your reflecting pool print order has shipped.</p>
				<p><strong>order:</strong> ${escapeHtml(displayOrderNumber)}</p>
				${trackingMarkup}
				<p>— Margaret</p>
			`,
		});
		if (result && typeof result === "object" && "error" in result && result.error) {
			console.error("LumaPrints shipment email failed:", result.error);
			return { status: "failed", error: formatError(result.error) };
		}
		return { status: "sent" };
	} catch (emailErr) {
		console.error("LumaPrints shipment email failed:", emailErr);
		return { status: "failed", error: formatError(emailErr) };
	}
}

function formatError(error: unknown): string {
	if (error instanceof Error) return error.message;
	if (typeof error === "string") return error;
	try {
		return JSON.stringify(error);
	} catch {
		return "Unknown shipment email delivery error";
	}
}

function getSafeTrackingUrl(value: string | undefined): string | null {
	if (!value) return null;
	try {
		const url = new URL(value);
		if (url.protocol !== "https:" && url.protocol !== "http:") return null;
		return url.toString();
	} catch {
		return null;
	}
}
