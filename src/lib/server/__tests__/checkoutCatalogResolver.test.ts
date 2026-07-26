import { describe, expect, it, vi } from "vitest";
import { resolveAuthoritativePrintSelection } from "$lib/server/checkoutCatalogResolver";

const ASSET = "123e4567-e89b-42d3-a456-426614174000";
const selectors = {
	productSlug: "spring-meadow",
	materialSlug: "archival-matte",
	sizeSlug: "8x10",
};
const snapshotItem = {
	productKey: "product_123",
	revisionId: "revision_123",
	productKind: "print" as const,
	variantKey: "variant_123",
	materialOptionKey: "archival-matte",
	sizeOptionKey: "8x10",
	borderOptionKey: null,
	frameOptionKey: null,
};

function graph() {
	return {
		schemaVersion: 2,
		productId: "product_123",
		revisionId: "revision_123",
		productKind: "print",
		title: "Untrusted public title",
		slug: "spring-meadow",
		description: null,
		seoDescription: null,
		currency: "usd",
		saleAvailability: "unavailable",
		variants: [
			{
				key: "variant_123",
				order: 0,
				materialOption: { slug: "archival-matte", label: "Public paper" },
				sizeOption: { slug: "8x10", label: "Public size", widthInches: 99, heightInches: 99 },
				retailPriceCents: 1,
			},
		],
		shopPlacement: { featured: false, orderRank: null },
		printOptions: {
			borderOptionsEnabled: false,
			frameOptionsEnabled: false,
			framePriceMultiplierBasisPoints: 20_000,
		},
		media: [],
	};
}

function privateAuthority() {
	return {
		version: 1,
		purpose: "checkout",
		item: { ...snapshotItem },
		identity: {
			productId: "product_123",
			revisionId: "revision_123",
			productKind: "print",
			title: "Private Spring",
			slug: "spring-meadow",
			variantKey: "variant_123",
		},
		commerce: {
			currency: "usd",
			amountCents: 3500,
			finish: {
				materialKey: "archival-matte",
				sizeKey: "8x10",
				borderKey: null,
				frameKey: null,
				paper: { name: "Archival Matte", subcategoryId: 103001 },
				size: { label: "8×10", width: 8, height: 10 },
				border: { inches: 0 },
				frame: { subcategoryId: 0 },
				canvas: null,
			},
		},
		media: [
			{
				role: "primary",
				asset: {
					assetId: ASSET,
					derivatives: {
						display1280: { contentType: "image/webp", width: 1280, height: 1024 },
					},
				},
			},
		],
	};
}

function dependencies(response: unknown = privateAuthority()) {
	return {
		query: vi.fn(async () => graph()) as never,
		resolve: vi.fn(async () => response),
	};
}

describe("private checkout catalog authority", () => {
	it("uses public discovery only for current identity and builds exact private display facts", async () => {
		const deps = dependencies();
		const result = await resolveAuthoritativePrintSelection(
			{
				...selectors,
				priceInDollars: 1,
				imageTitle: "Forged browser title",
				imageUrl: "https://forged.test/private-marker",
				productId: "forged-browser-id",
				availability: "available",
			} as never,
			deps,
		);
		expect(deps.query).toHaveBeenCalledWith({
			siteUrl: "zippymiggy.com",
			slug: selectors.productSlug,
		});
		expect(deps.resolve).toHaveBeenCalledWith(snapshotItem);
		expect(result).toEqual({
			amountCents: 3500,
			productName: "Private Spring — 8×10",
			productDescription: "Archival Matte print, 8×10 inches",
			imageUrl:
				"https://media.angelsrest.online/sites/zippymiggy.com/web/123e4567-e89b-42d3-a456-426614174000/display-1280.webp",
			metadata: {
				imageUrl:
					"https://media.angelsrest.online/sites/zippymiggy.com/web/123e4567-e89b-42d3-a456-426614174000/display-1280.webp",
				imageTitle: "Private Spring",
				paperSubcategoryId: "103001",
				paperWidth: "8",
				paperHeight: "10",
				paperName: "Archival Matte",
				paperSizeLabel: "8×10",
				productSlug: "spring-meadow",
			},
			checkoutSnapshot: {
				schemaVersion: 1,
				catalogProvider: "convex",
				items: [snapshotItem],
			},
		});
		expect(JSON.stringify(result)).not.toMatch(/Forged|Untrusted|forged\.test/);
	});

	it.each([
		[
			"identity mismatch",
			() => ({
				...privateAuthority(),
				identity: { ...privateAuthority().identity, productId: "other" },
			}),
		],
		[
			"echo mismatch",
			() => ({ ...privateAuthority(), item: { ...snapshotItem, variantKey: "other" } }),
		],
		[
			"invalid cents",
			() => ({
				...privateAuthority(),
				commerce: { ...privateAuthority().commerce, amountCents: 0 },
			}),
		],
		[
			"selector mismatch",
			() => ({
				...privateAuthority(),
				commerce: {
					...privateAuthority().commerce,
					finish: { ...privateAuthority().commerce.finish, materialKey: "other" },
				},
			}),
		],
		["unavailable authority", () => null],
		["malformed contract", () => ({ ...privateAuthority(), purpose: "paid_fulfillment" })],
	])("fails closed before bridge for %s", async (_label, response) => {
		await expect(
			resolveAuthoritativePrintSelection(selectors, dependencies(response())),
		).rejects.toMatchObject({
			status: expect.any(Number),
			message: "Selected print is unavailable",
		});
	});

	it("never falls back after private resolution fails", async () => {
		const deps = dependencies();
		deps.resolve.mockRejectedValueOnce(new Error("private response material"));
		await expect(resolveAuthoritativePrintSelection(selectors, deps)).rejects.toMatchObject({
			status: 503,
			message: "Selected print is unavailable",
		});
		expect(deps.query).toHaveBeenCalledOnce();
		expect(deps.resolve).toHaveBeenCalledOnce();
	});
});
