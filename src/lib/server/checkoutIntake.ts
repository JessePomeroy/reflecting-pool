import { adminConfig } from "$lib/config/admin";
import { createHubPrintCheckoutSession } from "$lib/server/checkoutBridge";
import { getRetailPrice } from "$lib/shop/pricing";
import type { CheckoutMetadata } from "$lib/shop/types";

export class CheckoutValidationError extends Error {
	status: number;

	constructor(status: number, message: string) {
		super(message);
		this.name = "CheckoutValidationError";
		this.status = status;
	}
}

export interface PrintCheckoutResult {
	url: string | null;
}

interface CheckoutRequestBody {
	productSlug?: unknown;
	imageUrl?: unknown;
	imageTitle?: unknown;
	paperName?: unknown;
	paperSubcategoryId?: unknown;
	paperWidth?: unknown;
	paperHeight?: unknown;
	paperSizeLabel?: unknown;
	priceInDollars?: unknown;
}

export async function createPrintCheckout(
	body: CheckoutRequestBody,
	baseUrl: string,
): Promise<PrintCheckoutResult> {
	const normalized = normalizeCheckoutRequest(body);

	const session = await createHubPrintCheckoutSession({
		// Convex tenant identity is the stored bare-domain key. Redirect URLs use
		// the public origin below; these values are deliberately not interchangeable.
		siteUrl: adminConfig.siteUrl,
		amountCents: Math.round(normalized.expectedPrice * 100),
		productName: `${normalized.imageTitle || "Fine Art Print"} — ${normalized.paperSizeLabel}`,
		productDescription: `${normalized.paperName} print, ${normalized.paperSizeLabel} inches`,
		imageUrl: normalized.imageUrl,
		metadata: normalized.metadata,
		successUrl: `${baseUrl}/shop/success?session_id={CHECKOUT_SESSION_ID}`,
		cancelUrl: `${baseUrl}/shop/cancelled`,
	});

	return { url: session.url };
}

export function normalizeCheckoutRequest(body: CheckoutRequestBody): {
	expectedPrice: number;
	imageUrl: string;
	imageTitle: string;
	paperName: string;
	paperSizeLabel: string;
	metadata: CheckoutMetadata;
} {
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

	if (!productSlug || !imageUrl || !paperName || !paperWidth || !paperHeight) {
		throw new CheckoutValidationError(400, "Missing required fields");
	}

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
		throw new CheckoutValidationError(400, "Invalid paper dimensions");
	}

	const subcategoryNum = Number(paperSubcategoryId);
	if (!Number.isFinite(subcategoryNum) || subcategoryNum <= 0) {
		throw new CheckoutValidationError(400, "Invalid paper subcategory");
	}

	const expectedPrice = getRetailPrice(String(paperName), {
		width: widthNum,
		height: heightNum,
		label: String(paperSizeLabel),
	});

	if (!expectedPrice || Math.abs(expectedPrice - Number(priceInDollars)) > 0.01) {
		throw new CheckoutValidationError(400, "Invalid price");
	}

	const metadata: CheckoutMetadata = {
		imageUrl: String(imageUrl),
		imageTitle: String(imageTitle || "Fine Art Print"),
		paperSubcategoryId: String(paperSubcategoryId),
		paperWidth: String(paperWidth),
		paperHeight: String(paperHeight),
		paperName: String(paperName),
		paperSizeLabel: String(paperSizeLabel),
		productSlug: String(productSlug),
	};

	return {
		expectedPrice,
		imageUrl: metadata.imageUrl,
		imageTitle: metadata.imageTitle,
		paperName: metadata.paperName,
		paperSizeLabel: metadata.paperSizeLabel,
		metadata,
	};
}
