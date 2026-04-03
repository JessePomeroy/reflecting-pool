import { json } from "@sveltejs/kit";
import { findOrderByLumaprintsNumber, updateSanityOrder } from "$lib/server/sanity";
import type { RequestHandler } from "./$types";

export const POST: RequestHandler = async ({ request }) => {
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
		payload = await request.json();
	} catch {
		return json({ error: "Invalid JSON" }, { status: 400 });
	}

	// LumaPrints sends webhook events for order status changes
	if (payload.event === "shipment.created") {
		const { orderNumber, trackingNumber, trackingUrl, carrier } = payload.data || {};

		if (!orderNumber) {
			console.error("LumaPrints webhook missing orderNumber");
			return json({ error: "Missing orderNumber" }, { status: 400 });
		}

		try {
			const order = await findOrderByLumaprintsNumber(orderNumber);

			if (order) {
				await updateSanityOrder(order._id, {
					status: "shipped",
					trackingNumber: trackingNumber || undefined,
					trackingUrl: trackingUrl || undefined,
					shippingCarrier: carrier || undefined,
					shippedAt: new Date().toISOString(),
				});

				// TODO: Send "order shipped" email to customer with tracking info
				console.log(`Order ${orderNumber} marked as shipped. Tracking: ${trackingNumber}`);
			} else {
				console.warn(`LumaPrints webhook: no order found for #${orderNumber}`);
			}
		} catch (err) {
			console.error("Failed to update order from LumaPrints webhook:", err);
			// Return 200 so LumaPrints doesn't retry — we'll handle it manually
		}
	}

	return json({ received: true });
};
