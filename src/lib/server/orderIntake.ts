import { Resend } from "resend";
import type Stripe from "stripe";
import { api } from "$convex/api";
import type { Id } from "$convex/dataModel";
import { env } from "$env/dynamic/private";
import { adminConfig } from "$lib/config/admin";
import { getConvex } from "$lib/server/convexClient";
import { escapeHtml } from "$lib/server/html";
import { buildLumaPrintsOrder, createOrder } from "$lib/server/lumaprints";
import type { CheckoutMetadata } from "$lib/shop/types";

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

interface CreatedOrderResult {
	_id: unknown;
	orderNumber: string;
	alreadyExisted?: boolean;
	lumaprintsOrderNumber?: string;
}

type CustomerDetails = Stripe.Checkout.Session["customer_details"];

export interface OrderIntakeResult {
	status: number;
	body: Record<string, unknown>;
}

/**
 * Shared secret between this webhook and the Convex mutations it calls
 * (`api.orders.create`, `api.orders.updateStatus`). Must be set on both
 * sides (Vercel `WEBHOOK_SECRET` + `npx convex env set WEBHOOK_SECRET`).
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
 * Narrow Stripe's loosely-typed metadata into our CheckoutMetadata shape.
 * Also range-checks numeric dimensions so crafted metadata cannot push
 * nonsense through to LumaPrints.
 */
export function validateCheckoutMetadata(data: Stripe.Metadata | null): CheckoutMetadata | null {
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

	const width = Number(data.paperWidth);
	const height = Number(data.paperHeight);
	if (!Number.isFinite(width) || width <= 0 || width > 120) return null;
	if (!Number.isFinite(height) || height <= 0 || height > 120) return null;
	const subcategory = Number(data.paperSubcategoryId);
	if (!Number.isFinite(subcategory) || subcategory <= 0) return null;

	return data as unknown as CheckoutMetadata;
}

/** Extract shipping details from a Stripe checkout session with type safety. */
export function extractShippingDetails(session: Stripe.Checkout.Session): ShippingDetails | null {
	const raw = (session as unknown as { shipping_details?: unknown }).shipping_details;
	if (!raw || typeof raw !== "object") return null;
	const r = raw as Record<string, unknown>;
	const addr = r.address as Record<string, unknown> | undefined;
	if (!addr || typeof addr !== "object") return null;
	const line1 = typeof addr.line1 === "string" ? addr.line1 : "";
	if (!line1) return null;
	const country = typeof addr.country === "string" ? addr.country : "";
	if (!country) return null;
	return {
		name: typeof r.name === "string" ? r.name : "",
		address: {
			line1,
			line2: typeof addr.line2 === "string" ? addr.line2 : undefined,
			city: typeof addr.city === "string" ? addr.city : "",
			state: typeof addr.state === "string" ? addr.state : "",
			postal_code: typeof addr.postal_code === "string" ? addr.postal_code : "",
			country,
		},
	};
}

export async function processStripeWebhookEvent(event: Stripe.Event): Promise<OrderIntakeResult> {
	if (event.type !== "checkout.session.completed") {
		return { status: 200, body: { received: true } };
	}

	const session = event.data.object as Stripe.Checkout.Session;

	const metadata = validateCheckoutMetadata(session.metadata);
	const shippingDetails = extractShippingDetails(session);
	const customerDetails = session.customer_details;

	if (!metadata || !shippingDetails) {
		console.error("Missing or invalid metadata/shipping details in Stripe session");
		return { status: 400, body: { error: "Missing session data" } };
	}

	const convex = getConvex();
	const amountDollars = (session.amount_total || 0) / 100;
	const paperDetails = `${metadata.paperName} - ${metadata.paperSizeLabel}`;

	const rawPaymentIntent = session.payment_intent as string | Stripe.PaymentIntent | null;
	const stripePaymentIntentId =
		typeof rawPaymentIntent === "string" ? rawPaymentIntent : rawPaymentIntent?.id;

	let orderResult: CreatedOrderResult;
	try {
		orderResult = (await convex.mutation(api.orders.create, {
			webhookSecret: getWebhookSecret(),
			siteUrl: adminConfig.siteUrl,
			stripeSessionId: session.id,
			customerEmail: customerDetails?.email || "",
			customerName: customerDetails?.name || shippingDetails.name || undefined,
			stripePaymentIntentId: stripePaymentIntentId || undefined,
			shippingAddress: {
				line1: shippingDetails.address.line1,
				line2: shippingDetails.address.line2,
				city: shippingDetails.address.city,
				state: shippingDetails.address.state,
				postalCode: shippingDetails.address.postal_code,
				country: shippingDetails.address.country,
			},
			items: [
				{
					productName: `${metadata.imageTitle} — ${paperDetails}`,
					quantity: 1,
					price: amountDollars,
				},
			],
			total: amountDollars,
			subtotal: session.amount_subtotal ? session.amount_subtotal / 100 : undefined,
			fulfillmentType: "lumaprints",
			paperName: metadata.paperName,
			paperSubcategoryId: metadata.paperSubcategoryId,
		})) as CreatedOrderResult;
	} catch (err) {
		console.error("Failed to create Convex order:", err);
		return { status: 200, body: { received: true, error: "convex_create_failed" } };
	}

	const { _id: orderId, orderNumber, alreadyExisted } = orderResult;
	const existingLumaprintsOrderNumber = orderResult.lumaprintsOrderNumber;
	let lumaprintsOrderNumber: string | undefined = existingLumaprintsOrderNumber;
	let lumaprintsFailed = false;

	if (!existingLumaprintsOrderNumber) {
		try {
			const nameParts = shippingDetails.name.split(" ");
			const firstName = nameParts[0] || "";
			const lastName = nameParts.slice(1).join(" ") || "";
			const addr = shippingDetails.address;

			const lpOrder = buildLumaPrintsOrder(
				orderNumber,
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
			lumaprintsOrderNumber = result.orderNumber;

			await convex.mutation(api.orders.updateStatus, {
				webhookSecret: getWebhookSecret(),
				orderId: orderId as Id<"orders">,
				lumaprintsOrderNumber: result.orderNumber,
				status: "printing",
			});
		} catch (err) {
			lumaprintsFailed = true;
			console.error("LumaPrints submission failed:", err);
			try {
				await convex.mutation(api.orders.updateStatus, {
					webhookSecret: getWebhookSecret(),
					orderId: orderId as Id<"orders">,
					status: "fulfillment_error",
					fulfillmentError: err instanceof Error ? err.message : "Unknown LumaPrints error",
				});
			} catch (updateErr) {
				console.error("Failed to mark order fulfillment_error:", updateErr);
			}

			await sendFulfillmentFailureAlert(orderNumber, customerDetails, err);
		}
	}

	if (!alreadyExisted && !lumaprintsFailed && customerDetails?.email) {
		await sendConfirmationEmails({
			orderNumber,
			lumaprintsOrderNumber,
			customerDetails,
			metadata,
			shippingDetails,
			paperDetails,
			amountDollars,
		});
	}

	return { status: 200, body: { received: true } };
}

async function sendFulfillmentFailureAlert(
	orderNumber: string,
	customerDetails: CustomerDetails,
	err: unknown,
) {
	if (!resend) return;
	try {
		await resend.emails.send({
			from: FROM_EMAIL,
			to: ADMIN_EMAIL,
			subject: `[URGENT] Order ${orderNumber} failed - manual attention needed`,
			html: `
				<p><strong style="color: red;">Order fulfillment failed!</strong></p>
				<p><strong>Order #:</strong> ${escapeHtml(orderNumber)}</p>
				<p><strong>Customer:</strong> ${escapeHtml(customerDetails?.name || "Unknown")} (${escapeHtml(customerDetails?.email || "")})</p>
				<p><strong>Error:</strong> ${escapeHtml(err instanceof Error ? err.message : "Unknown error")}</p>
				<p>Please check LumaPrints and process manually.</p>
			`,
		});
	} catch (emailErr) {
		console.error("Alert email failed:", emailErr);
	}
}

async function sendConfirmationEmails({
	orderNumber,
	lumaprintsOrderNumber,
	customerDetails,
	metadata,
	shippingDetails,
	paperDetails,
	amountDollars,
}: {
	orderNumber: string;
	lumaprintsOrderNumber?: string;
	customerDetails: NonNullable<CustomerDetails>;
	metadata: CheckoutMetadata;
	shippingDetails: ShippingDetails;
	paperDetails: string;
	amountDollars: number;
}) {
	if (!resend || !customerDetails.email) return;
	try {
		await resend.emails.send({
			from: FROM_EMAIL,
			to: ADMIN_EMAIL,
			subject: `New order ${orderNumber} - ${paperDetails}`,
			html: `
				<p><strong>New order received!</strong></p>
				<p><strong>Order #:</strong> ${escapeHtml(orderNumber)}</p>
				${lumaprintsOrderNumber ? `<p><strong>LumaPrints #:</strong> ${escapeHtml(lumaprintsOrderNumber)}</p>` : ""}
				<p><strong>Customer:</strong> ${escapeHtml(customerDetails.name || "Unknown")}</p>
				<p><strong>Email:</strong> ${escapeHtml(customerDetails.email)}</p>
				<p><strong>Item:</strong> ${escapeHtml(metadata.imageTitle || "N/A")}</p>
				<p><strong>Print:</strong> ${escapeHtml(paperDetails)}</p>
				<p><strong>Total:</strong> $${amountDollars.toFixed(2)}</p>
				<p><strong>Shipping address:</strong><br/>
				${escapeHtml(shippingDetails.name)}<br/>
				${escapeHtml(shippingDetails.address.line1)}<br/>
				${shippingDetails.address.line2 ? `${escapeHtml(shippingDetails.address.line2)}<br/>` : ""}
				${escapeHtml(shippingDetails.address.city)}, ${escapeHtml(shippingDetails.address.state)} ${escapeHtml(shippingDetails.address.postal_code)}</p>
			`,
		});

		const firstName = customerDetails.name?.split(" ")[0] || "there";
		await resend.emails.send({
			from: FROM_EMAIL,
			to: customerDetails.email,
			subject: "Thank you for your order!",
			html: `
				<p>Hi ${escapeHtml(firstName)},</p>
				<p>Thank you for your order! I've received it and it'll be on its way soon.</p>
				<p><strong>Order #:</strong> ${escapeHtml(orderNumber)}</p>
				<p><strong>Your print:</strong> ${escapeHtml(metadata.imageTitle)}</p>
				<p><strong>Size & paper:</strong> ${escapeHtml(paperDetails)}</p>
				<p><strong>Total:</strong> $${amountDollars.toFixed(2)}</p>
				<p>You'll receive tracking info once it ships.</p>
				<p>— Margaret</p>
			`,
		});
	} catch (emailErr) {
		console.error("Email sending failed:", emailErr);
	}
}
