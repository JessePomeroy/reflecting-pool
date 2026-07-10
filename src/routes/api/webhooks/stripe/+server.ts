import { json } from "@sveltejs/kit";
import type Stripe from "stripe";
import { getCommerceWebhookOwner } from "$lib/server/commerceWebhookOwnership";
import { processStripeWebhookEvent } from "$lib/server/orderIntake";
import { verifyWebhook } from "$lib/server/stripe";
import type { RequestHandler } from "./$types";

export const POST: RequestHandler = async ({ request }) => {
	const body = await request.text();
	const signature = request.headers.get("stripe-signature");

	if (!signature) {
		return json({ error: "Missing stripe-signature header" }, { status: 400 });
	}

	let event: Stripe.Event;
	try {
		event = await verifyWebhook(body, signature);
	} catch (err) {
		console.error("Stripe webhook verification failed:", err);
		return json({ error: "Invalid signature" }, { status: 400 });
	}

	if (event.type === "checkout.session.completed" && getCommerceWebhookOwner() === "hub") {
		console.error(
			"Received checkout.session.completed on the Reflecting Pool compatibility endpoint, but Angels Rest is configured as the commerce webhook owner.",
		);
		return json({ error: "Commerce webhook is owned by the Angels Rest hub" }, { status: 409 });
	}

	const result = await processStripeWebhookEvent(event);
	return json(result.body, { status: result.status });
};
