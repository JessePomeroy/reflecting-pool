import { error, json } from "@sveltejs/kit";
import { PUBLIC_SITE_URL } from "$env/static/public";
import { createCheckoutSession } from "$lib/server/stripe";
import { getRetailPrice } from "$lib/shop/pricing";
import type { CheckoutMetadata, PaperType } from "$lib/shop/types";
import type { RequestHandler } from "./$types";

export const POST: RequestHandler = async ({ request }) => {
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

	// Verify price matches our pricing table (prevent client-side tampering)
	const expectedPrice = getRetailPrice(paperName as PaperType, {
		width: paperWidth,
		height: paperHeight,
		label: paperSizeLabel,
	});

	if (!expectedPrice || expectedPrice !== priceInDollars) {
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
