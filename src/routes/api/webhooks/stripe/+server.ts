import { json } from "@sveltejs/kit";
import type Stripe from "stripe";
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

	const result = await processStripeWebhookEvent(event);
	return json(result.body, { status: result.status });
};
