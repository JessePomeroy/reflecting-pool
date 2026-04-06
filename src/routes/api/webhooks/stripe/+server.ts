import { json } from "@sveltejs/kit";
import { Resend } from "resend";
import type Stripe from "stripe";
import { env } from "$env/dynamic/private";
import { escapeHtml } from "$lib/server/html";
import { buildLumaPrintsOrder, createOrder } from "$lib/server/lumaprints";
import { createSanityOrder, updateSanityOrder } from "$lib/server/sanity";
import { verifyWebhook } from "$lib/server/stripe";
import type { CheckoutMetadata } from "$lib/shop/types";
import type { RequestHandler } from "./$types";

const resend = env.RESEND_API_KEY ? new Resend(env.RESEND_API_KEY) : null;
const ADMIN_EMAIL = env.ADMIN_EMAIL || "jesse@reflectingpool.com";
const FROM_EMAIL = env.FROM_EMAIL || "orders@reflectingpool.com";

interface ShippingDetails {
	name: string;
	address: {
		line1: string;
		line2?: string;
		city: string;
		state: string;
		postal_code: string;
		country: string;
	};
}

/** Narrow Stripe's loosely-typed metadata into our CheckoutMetadata shape. */
function validateCheckoutMetadata(data: Stripe.Metadata | null): CheckoutMetadata | null {
	if (!data) return null;
	const required = [
		"imageUrl",
		"imageTitle",
		"paperSubcategoryId",
		"paperWidth",
		"paperHeight",
		"paperName",
		"paperSizeLabel",
		"productSlug",
	] as const;
	for (const key of required) {
		if (typeof data[key] !== "string" || data[key].length === 0) return null;
	}
	return data as unknown as CheckoutMetadata;
}

/** Extract shipping details from a Stripe checkout session with type safety. */
function extractShippingDetails(session: Stripe.Checkout.Session): ShippingDetails | null {
	// `shipping_details` is exposed on the session when shipping_address_collection is set,
	// but Stripe's types surface it through the expanded shipping_cost → shipping_rate path.
	// Accept it via a narrow index access instead of a blanket `as any`.
	const raw = (session as unknown as { shipping_details?: unknown }).shipping_details;
	if (!raw || typeof raw !== "object") return null;
	const r = raw as Record<string, unknown>;
	const addr = r.address as Record<string, unknown> | undefined;
	if (!addr || typeof addr !== "object") return null;
	const line1 = typeof addr.line1 === "string" ? addr.line1 : "";
	if (!line1) return null;
	return {
		name: typeof r.name === "string" ? r.name : "",
		address: {
			line1,
			line2: typeof addr.line2 === "string" ? addr.line2 : undefined,
			city: typeof addr.city === "string" ? addr.city : "",
			state: typeof addr.state === "string" ? addr.state : "",
			postal_code: typeof addr.postal_code === "string" ? addr.postal_code : "",
			country: typeof addr.country === "string" ? addr.country : "US",
		},
	};
}

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
		const metadata = validateCheckoutMetadata(session.metadata);
		const shippingDetails = extractShippingDetails(session);
		const customerDetails = session.customer_details;

		if (!metadata || !shippingDetails) {
			console.error("Missing or invalid metadata/shipping details in Stripe session");
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
			const nameParts = shippingDetails.name.split(" ");
			const firstName = nameParts[0] || "";
			const lastName = nameParts.slice(1).join(" ") || "";
			const addr = shippingDetails.address;

			const lpOrder = buildLumaPrintsOrder(
				sanityOrder._id,
				{
					firstName,
					lastName,
					address1: addr.line1,
					address2: addr.line2,
					city: addr.city,
					state: addr.state,
					zip: addr.postal_code,
					country: addr.country,
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

			// 4. Send confirmation emails (wrapped in try/catch — email failure must NEVER crash webhook)
			if (resend && customerDetails?.email) {
				try {
					const orderTotal = (session.amount_total || 0) / 100;
					const paperDetails = `${metadata.paperName} - ${metadata.paperSizeLabel}`;

					// Send admin notification
					await resend.emails.send({
						from: FROM_EMAIL,
						to: ADMIN_EMAIL,
						subject: `New order #${result.orderNumber} - ${paperDetails}`,
						html: `
							<p><strong>New order received!</strong></p>
							<p><strong>Order #:</strong> ${escapeHtml(result.orderNumber)}</p>
							<p><strong>Customer:</strong> ${escapeHtml(customerDetails.name || "Unknown")}</p>
							<p><strong>Email:</strong> ${escapeHtml(customerDetails.email)}</p>
							<p><strong>Item:</strong> ${escapeHtml(metadata.imageTitle || "N/A")}</p>
							<p><strong>Print:</strong> ${escapeHtml(paperDetails)}</p>
							<p><strong>Total:</strong> $${orderTotal.toFixed(2)}</p>
							<p><strong>Shipping address:</strong><br/>
							${escapeHtml(shippingDetails.name)}<br/>
							${escapeHtml(shippingDetails.address.line1)}<br/>
							${shippingDetails.address.line2 ? escapeHtml(shippingDetails.address.line2) + "<br/>" : ""}
							${escapeHtml(shippingDetails.address.city)}, ${escapeHtml(shippingDetails.address.state)} ${escapeHtml(shippingDetails.address.postal_code)}</p>
						`,
					});

					// Send customer confirmation
					const firstName = customerDetails.name?.split(" ")[0] || "there";
					await resend.emails.send({
						from: FROM_EMAIL,
						to: customerDetails.email,
						subject: "Thank you for your order!",
						html: `
							<p>Hi ${escapeHtml(firstName)},</p>
							<p>Thank you for your order! I've received it and it'll be on its way soon.</p>
							<p><strong>Order #:</strong> ${escapeHtml(result.orderNumber)}</p>
							<p><strong>Your print:</strong> ${escapeHtml(metadata.imageTitle)}</p>
							<p><strong>Size & paper:</strong> ${escapeHtml(paperDetails)}</p>
							<p><strong>Total:</strong> $${orderTotal.toFixed(2)}</p>
							<p>You'll receive tracking info once it ships.</p>
							<p>— Margaret</p>
						`,
					});
				} catch (emailErr) {
					console.error("Email sending failed:", emailErr);
					// Email failure must never crash the webhook
				}
			}
		} catch (err) {
			// Don't crash — mark as error so we can retry manually
			console.error("LumaPrints submission failed:", err);
			await updateSanityOrder(sanityOrder._id, {
				status: "fulfillment_error",
				fulfillmentError: err instanceof Error ? err.message : "Unknown LumaPrints error",
			});

			// Send admin alert about failure
			if (resend) {
				try {
					await resend.emails.send({
						from: FROM_EMAIL,
						to: ADMIN_EMAIL,
						subject: `[URGENT] Order ${sanityOrder._id} failed - manual attention needed`,
						html: `
							<p><strong style="color: red;">Order fulfillment failed!</strong></p>
							<p><strong>Order ID:</strong> ${escapeHtml(sanityOrder._id)}</p>
							<p><strong>Customer:</strong> ${escapeHtml(customerDetails?.name || "Unknown")} (${escapeHtml(customerDetails?.email || "")})</p>
							<p><strong>Error:</strong> ${escapeHtml(err instanceof Error ? err.message : "Unknown error")}</p>
							<p>Please check LumaPrints and process manually.</p>
						`,
					});
				} catch (emailErr) {
					console.error("Alert email failed:", emailErr);
				}
			}
		}
	}

	// Always return 200 so Stripe doesn't retry indefinitely
	return json({ received: true });
};
