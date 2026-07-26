import { adminConfig } from "$lib/config/admin";
import { createHubPrintCheckoutSession } from "$lib/server/checkoutBridge";
import { resolveAuthoritativePrintSelection } from "$lib/server/checkoutCatalogResolver";
import { CheckoutValidationError } from "$lib/server/checkoutError";
import { getRetailPrice } from "$lib/shop/pricing";
import type { CheckoutMetadata } from "$lib/shop/types";

export { CheckoutValidationError } from "$lib/server/checkoutError";
export const HANDLE_CHECKOUT_MODE = "handle-v2";
const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const ATTEMPT_MAX_AGE_MS = (23 * 60 + 55) * 60 * 1000;
const CLOCK_SKEW_MS = 5 * 60 * 1000;

export class CheckoutAttemptError extends CheckoutValidationError {}

export interface PrintCheckoutResult {
	url: string | null;
}

export interface CheckoutRequestBody {
	productSlug?: unknown;
	imageUrl?: unknown;
	imageTitle?: unknown;
	paperName?: unknown;
	paperSubcategoryId?: unknown;
	paperWidth?: unknown;
	paperHeight?: unknown;
	paperSizeLabel?: unknown;
	priceInDollars?: unknown;
	materialSlug?: unknown;
	sizeSlug?: unknown;
	attempt?: unknown;
	attemptStartedAt?: unknown;
}

export function checkoutSnapshotMode(value: string | undefined) {
	return value === HANDLE_CHECKOUT_MODE ? HANDLE_CHECKOUT_MODE : "legacy";
}

export function validateCheckoutAttempt(body: CheckoutRequestBody, now = Date.now()) {
	if (typeof body.attempt !== "string" || !UUID_V4.test(body.attempt)) {
		throw new CheckoutAttemptError(409, "Checkout attempt rejected");
	}
	if (
		!Number.isSafeInteger(body.attemptStartedAt) ||
		(body.attemptStartedAt as number) > now + CLOCK_SKEW_MS ||
		now - (body.attemptStartedAt as number) > ATTEMPT_MAX_AGE_MS
	) {
		throw new CheckoutAttemptError(409, "Checkout attempt rejected");
	}
	return { attempt: body.attempt, attemptStartedAt: body.attemptStartedAt as number };
}

export async function createPrintCheckout(
	body: CheckoutRequestBody,
	baseUrl: string,
	mode: "legacy" | "handle-v2" = "legacy",
): Promise<PrintCheckoutResult> {
	if (mode === "handle-v2") {
		const attempt = validateCheckoutAttempt(body);
		const resolved = await resolveAuthoritativePrintSelection({
			productSlug: body.productSlug,
			materialSlug: body.materialSlug,
			sizeSlug: body.sizeSlug,
		});
		const session = await createHubPrintCheckoutSession({
			siteUrl: adminConfig.siteUrl,
			amountCents: resolved.amountCents,
			productName: resolved.productName,
			productDescription: resolved.productDescription,
			imageUrl: resolved.imageUrl,
			metadata: resolved.metadata,
			successUrl: `${baseUrl}/shop/success?session_id={CHECKOUT_SESSION_ID}`,
			cancelUrl: `${baseUrl}/shop/cancelled`,
			...attempt,
			checkoutSnapshot: resolved.checkoutSnapshot,
		});
		return { url: session.url };
	}

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
	)
		throw new CheckoutValidationError(400, "Invalid paper dimensions");
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
