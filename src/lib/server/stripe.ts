// Stripe helpers — server-only
// Creates checkout sessions and verifies webhooks

import Stripe from "stripe";
import { STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET } from "$env/static/private";
import type { CheckoutMetadata } from "$lib/shop/types";

export const stripe = new Stripe(STRIPE_SECRET_KEY, {
	// Pinned to a tested API version. Stripe SDK v22 narrows `apiVersion`
	// to its build-time default ("2026-02-25.clover"); at runtime Stripe
	// accepts any still-supported version string, so pinning to the
	// integration-tested version is safe. Cast works around the type
	// narrowing without changing behavior.
	apiVersion: "2025-03-31.basil" as Stripe.LatestApiVersion,
});

interface CreateCheckoutParams {
	/** Retail price in dollars (will be converted to cents) */
	priceInDollars: number;
	/** Human-readable product name for Stripe line item */
	productName: string;
	/** Product description (paper + size) */
	productDescription: string;
	/** Image URL for Stripe checkout display */
	imageUrl: string;
	/** Metadata to attach to the session (used in webhook) */
	metadata: CheckoutMetadata;
	/** URL to redirect to on success */
	successUrl: string;
	/** URL to redirect to on cancel */
	cancelUrl: string;
}

/** Create a Stripe Checkout session for a print purchase */
export async function createCheckoutSession(
	params: CreateCheckoutParams,
): Promise<Stripe.Checkout.Session> {
	const session = await stripe.checkout.sessions.create({
		mode: "payment",
		payment_method_types: ["card"],
		shipping_address_collection: {
			allowed_countries: ["US", "CA"],
		},
		line_items: [
			{
				price_data: {
					currency: "usd",
					unit_amount: Math.round(params.priceInDollars * 100),
					product_data: {
						name: params.productName,
						description: params.productDescription,
						images: [params.imageUrl],
					},
				},
				quantity: 1,
			},
		],
		metadata: params.metadata as unknown as Stripe.MetadataParam,
		success_url: params.successUrl,
		cancel_url: params.cancelUrl,
	});

	return session;
}

/** Verify a Stripe webhook signature and parse the event */
export async function verifyWebhook(body: string, signature: string): Promise<Stripe.Event> {
	return stripe.webhooks.constructEvent(body, signature, STRIPE_WEBHOOK_SECRET);
}
