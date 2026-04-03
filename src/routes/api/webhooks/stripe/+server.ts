import { json } from "@sveltejs/kit";
import type Stripe from "stripe";
import { buildLumaPrintsOrder, createOrder } from "$lib/server/lumaprints";
import { createSanityOrder, updateSanityOrder } from "$lib/server/sanity";
import { verifyWebhook } from "$lib/server/stripe";
import type { CheckoutMetadata } from "$lib/shop/types";
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

	if (event.type === "checkout.session.completed") {
		const session = event.data.object as Stripe.Checkout.Session;
		const metadata = session.metadata as unknown as CheckoutMetadata;
		const customerDetails = session.customer_details;
		// shipping_details exists on Checkout.Session when shipping_address_collection is set
		const shippingDetails = (session as unknown as Record<string, unknown>).shipping_details as {
			name?: string;
			address?: {
				line1?: string;
				line2?: string;
				city?: string;
				state?: string;
				postal_code?: string;
				country?: string;
			};
		} | null;

		if (!metadata?.imageUrl || !shippingDetails?.address) {
			console.error("Missing metadata or shipping details in Stripe session");
			return json({ error: "Missing session data" }, { status: 400 });
		}

		// 1. Create order in Sanity
		let sanityOrder: Awaited<ReturnType<typeof createSanityOrder>> | undefined;
		try {
			sanityOrder = await createSanityOrder({
				stripeSessionId: session.id,
				customerName: customerDetails?.name || "Unknown",
				customerEmail: customerDetails?.email || "",
				paperName: metadata.paperName,
				paperSize: metadata.paperSizeLabel,
				amount: (session.amount_total || 0) / 100,
				imageUrl: metadata.imageUrl,
				imageTitle: metadata.imageTitle,
			});
		} catch (err) {
			console.error("Failed to create Sanity order:", err);
			return json({ received: true, error: "sanity_create_failed" }, { status: 200 });
		}

		// 2. Submit to LumaPrints
		try {
			const nameParts = (shippingDetails.name || "").split(" ");
			const firstName = nameParts[0] || "";
			const lastName = nameParts.slice(1).join(" ") || "";
			const addr = shippingDetails.address;

			const lpOrder = buildLumaPrintsOrder(
				sanityOrder._id,
				{
					firstName,
					lastName,
					address1: addr.line1 || "",
					address2: addr.line2 || undefined,
					city: addr.city || "",
					state: addr.state || "",
					zip: addr.postal_code || "",
					country: addr.country || "US",
				},
				[
					{
						imageUrl: metadata.imageUrl,
						paperSubcategoryId: Number(metadata.paperSubcategoryId),
						width: Number(metadata.paperWidth),
						height: Number(metadata.paperHeight),
						quantity: 1,
					},
				],
			);

			const result = await createOrder(lpOrder);

			// 3. Update Sanity with LumaPrints order number
			await updateSanityOrder(sanityOrder._id, {
				lumaprintsOrderNumber: result.orderNumber,
				status: "submitted",
			});
		} catch (err) {
			// Don't crash — mark as error so we can retry manually
			console.error("LumaPrints submission failed:", err);
			await updateSanityOrder(sanityOrder._id, {
				status: "fulfillment_error",
				fulfillmentError: err instanceof Error ? err.message : "Unknown LumaPrints error",
			});
			// TODO: Send alert to admin (email/Slack notification)
		}
	}

	// Always return 200 so Stripe doesn't retry indefinitely
	return json({ received: true });
};
