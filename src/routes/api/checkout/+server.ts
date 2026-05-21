import { error, json } from "@sveltejs/kit";
import { PUBLIC_SITE_URL } from "$env/static/public";
import { CheckoutValidationError, createPrintCheckout } from "$lib/server/checkoutIntake";
import { rateLimit } from "$lib/server/rate-limit";
import type { RequestHandler } from "./$types";

export const POST: RequestHandler = async ({ request, getClientAddress }) => {
	const ip = getClientAddress();
	const { allowed } = rateLimit(ip, 10, 60_000);
	if (!allowed) {
		error(429, "too many requests — please try again later");
	}

	const body = await request.json();
	const baseUrl = PUBLIC_SITE_URL || "http://localhost:5173";

	try {
		const session = await createPrintCheckout(body, baseUrl);
		return json({ url: session.url });
	} catch (err) {
		if (err instanceof CheckoutValidationError) {
			error(err.status, err.message);
		}

		console.error("Checkout error:", err);
		error(500, "Failed to create checkout session");
	}
};
