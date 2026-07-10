import { env } from "$env/dynamic/private";

export type CommerceWebhookOwner = "hub" | "spoke";

/**
 * Resolve the staged Stripe commerce-webhook owner.
 *
 * Existing deployments default to `spoke` so deploying this guard cannot drop
 * orders before Stripe's live endpoint has been verified. The migration target
 * is `hub`; once configured, an accidentally retained spoke endpoint fails
 * loudly and performs no order, fulfillment, refund, or email side effects.
 */
export function resolveCommerceWebhookOwner(value: string | undefined): CommerceWebhookOwner {
	if (!value) return "spoke";
	if (value === "hub" || value === "spoke") return value;
	throw new Error('STRIPE_COMMERCE_WEBHOOK_OWNER must be "hub" or "spoke"');
}

export function getCommerceWebhookOwner(): CommerceWebhookOwner {
	return resolveCommerceWebhookOwner(env.STRIPE_COMMERCE_WEBHOOK_OWNER);
}
