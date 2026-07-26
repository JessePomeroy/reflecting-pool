import type { FunctionReturnType } from "convex/server";
import { api } from "$convex/api";
import { adminConfig } from "$lib/config/admin";
import { resolvePrivateCheckout } from "$lib/server/checkoutPrivateResolver";
import { publicCmsDisplayImageUrl } from "$lib/server/content/portfolioCluster";
import { getConvex } from "$lib/server/convexClient";
import type { CheckoutMetadata } from "$lib/shop/types";
import { CheckoutValidationError } from "./checkoutError";

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const IDENTIFIER = /^[A-Za-z0-9_-]{1,128}$/;
const STABLE_KEY = /^[A-Za-z0-9]+(?:[._:-][A-Za-z0-9]+)*$/;
type PublishedProduct = FunctionReturnType<typeof api.catalogProductGraphs.getPublishedBySlug>;
type Dependencies = {
	query?: (args: { siteUrl: string; slug: string }) => Promise<PublishedProduct>;
	resolve?: (item: CheckoutSnapshotItem) => Promise<unknown>;
};
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
function invalid(status = 400): never {
	throw new CheckoutValidationError(status, "Selected print is unavailable");
}
function object(value: unknown): value is Record<string, unknown> {
	return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
function required(value: unknown, keys: string) {
	if (!object(value)) invalid();
	const expected = keys.split(" ");
	if (Object.keys(value).length !== expected.length || !expected.every((key) => key in value))
		invalid();
	return value;
}
function bounded(value: unknown, max: number) {
	if (
		typeof value !== "string" ||
		!value ||
		value !== value.trim() ||
		Buffer.byteLength(value) > max
	)
		invalid();
	return value;
}
function identifier(value: unknown) {
	if (typeof value !== "string" || !IDENTIFIER.test(value)) invalid();
	return value;
}
function stableKey(value: unknown) {
	const key = bounded(value, 128);
	if (!STABLE_KEY.test(key)) invalid();
	return key;
}
function positiveSafeInteger(value: unknown) {
	if (!Number.isSafeInteger(value) || Number(value) <= 0) invalid();
	return Number(value);
}
function item(value: unknown): CheckoutSnapshotItem {
	const parsed = required(
		value,
		"productKey revisionId productKind variantKey materialOptionKey sizeOptionKey borderOptionKey frameOptionKey",
	);
	if (parsed.productKind !== "print" || parsed.borderOptionKey !== null) invalid();
	if (parsed.frameOptionKey !== null) invalid();
	return {
		productKey: identifier(parsed.productKey),
		revisionId: identifier(parsed.revisionId),
		productKind: "print",
		variantKey: stableKey(parsed.variantKey),
		materialOptionKey: stableKey(parsed.materialOptionKey),
		sizeOptionKey: stableKey(parsed.sizeOptionKey),
		borderOptionKey: null,
		frameOptionKey: null,
	};
}
function discover(product: PublishedProduct, slug: string, material: string, size: string) {
	if (
		!product ||
		product.schemaVersion !== 2 ||
		product.productKind !== "print" ||
		product.slug !== slug ||
		!Array.isArray(product.variants)
	)
		invalid(product ? 400 : 404);
	const variants = product.variants.filter(
		(value) => value.materialOption?.slug === material && value.sizeOption?.slug === size,
	);
	if (variants.length !== 1) invalid();
	return item({
		productKey: product.productId,
		revisionId: product.revisionId,
		productKind: "print",
		variantKey: variants[0]?.key,
		materialOptionKey: material,
		sizeOptionKey: size,
		borderOptionKey: null,
		frameOptionKey: null,
	});
}
function authority(value: unknown, requested: CheckoutSnapshotItem, slug: string) {
	const root = required(value, "version purpose item identity commerce media");
	if (root.version !== 1 || root.purpose !== "checkout") invalid();
	const echoed = item(root.item);
	const identity = required(
		root.identity,
		"productId revisionId productKind title slug variantKey",
	);
	const commerce = required(root.commerce, "currency amountCents finish");
	const finish = required(
		commerce.finish,
		"materialKey sizeKey borderKey frameKey paper size border frame canvas",
	);
	const paper = required(finish.paper, "name subcategoryId");
	const size = required(finish.size, "label width height");
	if (
		(Object.keys(echoed) as Array<keyof CheckoutSnapshotItem>).some(
			(key) => echoed[key] !== requested[key],
		) ||
		identity.productId !== echoed.productKey ||
		identity.revisionId !== echoed.revisionId ||
		identity.productKind !== echoed.productKind ||
		identity.variantKey !== echoed.variantKey ||
		identity.slug !== slug ||
		commerce.currency !== "usd" ||
		finish.materialKey !== echoed.materialOptionKey ||
		finish.sizeKey !== echoed.sizeOptionKey ||
		finish.borderKey !== echoed.borderOptionKey ||
		finish.frameKey !== echoed.frameOptionKey
	)
		invalid();
	if (!Array.isArray(root.media) || root.media.length > 20) invalid();
	const primary = root.media.filter((media) => object(media) && media.role === "primary");
	if (primary.length !== 1 || !object(primary[0]?.asset)) invalid();
	const asset = primary[0].asset;
	if (!UUID_V4.test(String(asset.assetId)) || !object(asset.derivatives)) invalid();
	const display = asset.derivatives.display1280;
	if (!object(display) || display.contentType !== "image/webp") invalid();
	positiveSafeInteger(display.width);
	positiveSafeInteger(display.height);
	return {
		item: echoed,
		amountCents: positiveSafeInteger(commerce.amountCents),
		title: bounded(identity.title, 500),
		paperName: bounded(paper.name, 120),
		sizeLabel: bounded(size.label, 120),
		paperSubcategoryId: positiveSafeInteger(paper.subcategoryId),
		width: positiveSafeInteger(size.width),
		height: positiveSafeInteger(size.height),
		imageUrl: publicCmsDisplayImageUrl(adminConfig.siteUrl, String(asset.assetId)),
		productSlug: bounded(identity.slug, 200),
	};
}
export async function resolveAuthoritativePrintSelection(
	selectors: { productSlug: unknown; materialSlug: unknown; sizeSlug: unknown },
	dependencies: Dependencies = {},
): Promise<AuthoritativePrintSelection> {
	const productSlug = bounded(selectors.productSlug, 200);
	const materialSlug = stableKey(selectors.materialSlug);
	const sizeSlug = stableKey(selectors.sizeSlug);
	const query =
		dependencies.query ??
		((args) => getConvex().query(api.catalogProductGraphs.getPublishedBySlug, args));
	const discovered = discover(
		await query({ siteUrl: adminConfig.siteUrl, slug: productSlug }),
		productSlug,
		materialSlug,
		sizeSlug,
	);
	let resolved: unknown;
	try {
		resolved = await (dependencies.resolve ?? resolvePrivateCheckout)(discovered);
	} catch (error) {
		if (error instanceof CheckoutValidationError) throw error;
		invalid(503);
	}
	const selected = authority(resolved, discovered, productSlug);
	const metadata: CheckoutMetadata = {
		imageUrl: selected.imageUrl,
		imageTitle: selected.title,
		paperSubcategoryId: String(selected.paperSubcategoryId),
		paperWidth: String(selected.width),
		paperHeight: String(selected.height),
		paperName: selected.paperName,
		paperSizeLabel: selected.sizeLabel,
		productSlug: selected.productSlug,
	};
	return {
		amountCents: selected.amountCents,
		productName: `${selected.title} — ${selected.sizeLabel}`,
		productDescription: `${selected.paperName} print, ${selected.sizeLabel} inches`,
		imageUrl: selected.imageUrl,
		metadata,
		checkoutSnapshot: { schemaVersion: 1, catalogProvider: "convex", items: [selected.item] },
	};
}
