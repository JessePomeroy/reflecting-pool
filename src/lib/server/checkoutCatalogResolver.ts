import type { FunctionReturnType } from "convex/server";
import { api } from "$convex/api";
import { adminConfig } from "$lib/config/admin";
import { publicCmsDisplayImageUrl } from "$lib/server/content/portfolioCluster";
import { getConvex } from "$lib/server/convexClient";
import { getPaper } from "$lib/shop/printCatalog";
import type { CheckoutMetadata } from "$lib/shop/types";
import { CheckoutValidationError } from "./checkoutError";

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const IDENTIFIER = /^[A-Za-z0-9_-]{1,128}$/;
const STABLE_KEY = /^[A-Za-z0-9]+(?:[._:-][A-Za-z0-9]+)*$/;
const VARIANT_KEY_MAX_LENGTH = 120;
type PublishedProduct = FunctionReturnType<typeof api.catalogProductGraphs.getPublishedBySlug>;
type CatalogQuery = (args: { siteUrl: string; slug: string }) => Promise<PublishedProduct>;

export interface AuthoritativePrintSelection {
	amountCents: number;
	productName: string;
	productDescription: string;
	imageUrl: string;
	metadata: CheckoutMetadata;
	checkoutSnapshot: {
		schemaVersion: 1;
		catalogProvider: "convex";
		items: [CheckoutSnapshotItem];
	};
}

export interface CheckoutSnapshotItem {
	productKey: string;
	revisionId: string;
	productKind: "print";
	variantKey: string;
	materialOptionKey: string;
	sizeOptionKey: string;
	borderOptionKey: null;
	frameOptionKey: null;
}

function invalid(message = "Selected print is unavailable"): never {
	throw new CheckoutValidationError(400, message);
}

function identifier(value: unknown) {
	if (typeof value !== "string" || !IDENTIFIER.test(value)) invalid();
	return value;
}

function variantKey(value: unknown) {
	if (
		typeof value !== "string" ||
		value.length > VARIANT_KEY_MAX_LENGTH ||
		!STABLE_KEY.test(value)
	) {
		invalid();
	}
	return value;
}

function bounded(value: unknown, max: number) {
	if (
		typeof value !== "string" ||
		!value.trim() ||
		value !== value.trim() ||
		Buffer.byteLength(value, "utf8") > max
	) {
		invalid();
	}
	return value;
}

function positiveSafeInteger(value: unknown) {
	if (!Number.isSafeInteger(value) || (value as number) <= 0) invalid();
	return value as number;
}

export async function resolveAuthoritativePrintSelection(
	selectors: { productSlug: unknown; materialSlug: unknown; sizeSlug: unknown },
	query: CatalogQuery = (args) =>
		getConvex().query(api.catalogProductGraphs.getPublishedBySlug, args),
): Promise<AuthoritativePrintSelection> {
	const productSlug = bounded(selectors.productSlug, 200);
	const materialSlug = bounded(selectors.materialSlug, 120);
	const sizeSlug = bounded(selectors.sizeSlug, 120);
	const product = await query({ siteUrl: adminConfig.siteUrl, slug: productSlug });
	if (!product) throw new CheckoutValidationError(404, "Print not found");
	if (
		product.schemaVersion !== 2 ||
		product.productKind !== "print" ||
		product.slug !== productSlug ||
		product.currency !== "usd" ||
		product.saleAvailability !== "available"
	) {
		invalid();
	}
	const matches = product.variants.filter(
		(variant) =>
			variant.materialOption?.slug === materialSlug && variant.sizeOption?.slug === sizeSlug,
	);
	if (matches.length !== 1) invalid();
	const variant = matches[0];
	if (!variant?.materialOption || !variant.sizeOption) invalid();
	const productId = identifier(product.productId);
	const revisionId = identifier(product.revisionId);
	const variantId = variantKey(variant.key);
	const title = bounded(product.title, 500);
	const amountCents = positiveSafeInteger(variant.retailPriceCents);
	const paper = getPaper(materialSlug);
	if (!paper || !Number.isSafeInteger(paper.subcategoryId) || paper.subcategoryId <= 0) invalid();
	const width = positiveSafeInteger(variant.sizeOption.widthInches);
	const height = positiveSafeInteger(variant.sizeOption.heightInches);
	const primary = product.media.filter((media) => media.role === "primary");
	if (primary.length !== 1) invalid();
	const assetId = primary[0]?.asset.assetId;
	const display = primary[0]?.asset.derivatives.display1280;
	if (
		typeof assetId !== "string" ||
		!UUID_V4.test(assetId) ||
		display?.contentType !== "image/webp" ||
		!Number.isSafeInteger(display.width) ||
		(display.width as number) <= 0 ||
		!Number.isSafeInteger(display.height) ||
		(display.height as number) <= 0
	) {
		invalid();
	}
	const imageUrl = publicCmsDisplayImageUrl(adminConfig.siteUrl, assetId);
	const sizeLabel = bounded(variant.sizeOption.label, 120);
	const paperName = bounded(variant.materialOption.label, 120);
	const metadata: CheckoutMetadata = {
		imageUrl,
		imageTitle: title,
		paperSubcategoryId: String(paper.subcategoryId),
		paperWidth: String(width),
		paperHeight: String(height),
		paperName,
		paperSizeLabel: sizeLabel,
		productSlug,
	};
	return {
		amountCents,
		productName: `${title} — ${sizeLabel}`,
		productDescription: `${paperName} print, ${sizeLabel} inches`,
		imageUrl,
		metadata,
		checkoutSnapshot: {
			schemaVersion: 1,
			catalogProvider: "convex",
			items: [
				{
					productKey: productId,
					revisionId,
					productKind: "print",
					variantKey: variantId,
					materialOptionKey: materialSlug,
					sizeOptionKey: sizeSlug,
					borderOptionKey: null,
					frameOptionKey: null,
				},
			],
		},
	};
}
