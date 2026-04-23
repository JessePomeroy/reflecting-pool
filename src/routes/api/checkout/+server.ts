import { error, json } from "@sveltejs/kit";
import { PUBLIC_SITE_URL } from "$env/static/public";
import { rateLimit } from "$lib/server/rate-limit";
import { createCheckoutSession } from "$lib/server/stripe";
import { getRetailPrice } from "$lib/shop/pricing";
import type { CheckoutMetadata } from "$lib/shop/types";
import type { RequestHandler } from "./$types";

export const POST: RequestHandler = async ({ request, getClientAddress }) => {
	// Rate limiting: 10 requests per minute per IP
	const ip = getClientAddress();
	const { allowed } = rateLimit(ip, 10, 60_000);
	if (!allowed) {
		error(429, "too many requests — please try again later");
	}

	const body = await request.json();

	const {
		productSlug,
		imageUrl,
		imageTitle,
		paperName,
		paperSubcategoryId,
		paperWidth,
		paperHeight,
		paperSizeLabel,
		priceInDollars,
	} = body;

	// Validate required fields
	if (!productSlug || !imageUrl || !paperName || !paperWidth || !paperHeight) {
		error(400, "Missing required fields");
	}

	// Audit H31: numeric + range check on paper dimensions. Without this,
	// a crafted request could push `paperWidth: 999999` through to the
	// webhook → LumaPrints, with no upper bound on the order. Mirrored in
	// the webhook as defense-in-depth.
	const widthNum = Number(paperWidth);
	const heightNum = Number(paperHeight);
	if (
		!Number.isFinite(widthNum) ||
		widthNum <= 0 ||
		widthNum > 120 ||
		!Number.isFinite(heightNum) ||
		heightNum <= 0 ||
		heightNum > 120
	) {
		error(400, "Invalid paper dimensions");
	}
	const subcategoryNum = Number(paperSubcategoryId);
	if (!Number.isFinite(subcategoryNum) || subcategoryNum <= 0) {
		error(400, "Invalid paper subcategory");
	}

	// Verify price matches our pricing table (prevent client-side tampering)
	const expectedPrice = getRetailPrice(paperName as string, {
		width: widthNum,
		height: heightNum,
		label: paperSizeLabel,
	});

	// Audit H6: tolerant compare so future computed prices don't break on
	// a fractional-cent rounding difference. Integer-cents is the right
	// long-term fix; this is the interim.
	if (!expectedPrice || Math.abs(expectedPrice - Number(priceInDollars)) > 0.01) {
		error(400, "Invalid price");
	}

	const metadata: CheckoutMetadata = {
		imageUrl,
		imageTitle: imageTitle || "Fine Art Print",
		paperSubcategoryId: String(paperSubcategoryId),
		paperWidth: String(paperWidth),
		paperHeight: String(paperHeight),
		paperName,
		paperSizeLabel,
		productSlug,
	};

	const baseUrl = PUBLIC_SITE_URL || "http://localhost:5173";

	try {
		const session = await createCheckoutSession({
			priceInDollars: expectedPrice,
			productName: `${imageTitle || "Fine Art Print"} — ${paperSizeLabel}`,
			productDescription: `${paperName} print, ${paperSizeLabel} inches`,
			imageUrl,
			metadata,
			successUrl: `${baseUrl}/shop/success?session_id={CHECKOUT_SESSION_ID}`,
			cancelUrl: `${baseUrl}/shop/cancelled`,
		});

		return json({ url: session.url });
	} catch (err) {
		console.error("Stripe checkout error:", err);
		error(500, "Failed to create checkout session");
	}
};
