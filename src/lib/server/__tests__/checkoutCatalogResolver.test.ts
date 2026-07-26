import { describe, expect, it, vi } from "vitest";
import { resolveAuthoritativePrintSelection } from "$lib/server/checkoutCatalogResolver";

const ASSET = "123e4567-e89b-42d3-a456-426614174000";

function graph() {
	return {
		schemaVersion: 2,
		productId: "product_123",
		revisionId: "revision_123",
		productKind: "print",
		title: "Spring Meadow",
		slug: "spring-meadow",
		description: null,
		seoDescription: null,
		currency: "usd",
		saleAvailability: "available",
		variants: [
			{
				key: "variant_123",
				order: 0,
				materialOption: { slug: "archival-matte", label: "Archival Matte" },
				sizeOption: { slug: "8x10", label: "8×10", widthInches: 8, heightInches: 10 },
				retailPriceCents: 3500,
			},
		],
		shopPlacement: { featured: false, orderRank: null },
		printOptions: {
			borderOptionsEnabled: false,
			frameOptionsEnabled: false,
			framePriceMultiplierBasisPoints: 20_000,
		},
		media: [
			{
				key: "primary",
				role: "primary",
				order: 0,
				altText: "Spring meadow",
				asset: {
					assetId: ASSET,
					source: { width: 3000, height: 2400 },
					derivatives: {
						thumb: { contentType: "image/webp", width: 320, height: 256 },
						card: { contentType: "image/webp", width: 768, height: 614 },
						display1280: { contentType: "image/webp", width: 1280, height: 1024 },
						display2048: { contentType: "image/webp", width: 2048, height: 1638 },
						display2560: { contentType: "image/webp", width: 2560, height: 2048 },
					},
				},
			},
		],
	};
}

const selectors = {
	productSlug: "spring-meadow",
	materialSlug: "archival-matte",
	sizeSlug: "8x10",
};

function query(value: unknown) {
	return vi.fn(async () => value) as never;
}

describe("authoritative Convex print checkout projection", () => {
	it("maps one published selection and approved primary media to the handle snapshot", async () => {
		const read = query(graph());
		const result = await resolveAuthoritativePrintSelection(
			{ ...selectors, imageUrl: "https://evil.test/forged", retailPriceCents: 1 } as never,
			read,
		);
		expect(read).toHaveBeenCalledWith({ siteUrl: "zippymiggy.com", slug: "spring-meadow" });
		expect(result).toMatchObject({
			amountCents: 3500,
			productName: "Spring Meadow — 8×10",
			imageUrl:
				"https://media.angelsrest.online/sites/zippymiggy.com/web/123e4567-e89b-42d3-a456-426614174000/display-1280.webp",
			metadata: {
				imageTitle: "Spring Meadow",
				paperSubcategoryId: "103001",
				paperWidth: "8",
				paperHeight: "10",
			},
			checkoutSnapshot: {
				schemaVersion: 1,
				catalogProvider: "convex",
				items: [
					{
						productKey: "product_123",
						revisionId: "revision_123",
						variantKey: "variant_123",
						materialOptionKey: "archival-matte",
						sizeOptionKey: "8x10",
					},
				],
			},
		});
		expect(JSON.stringify(result)).not.toContain("evil.test");
	});

	it("accepts the CRM stable-key alphabet for published variants", async () => {
		const published = graph();
		published.variants[0].key = "print.variant:8x10";

		const result = await resolveAuthoritativePrintSelection(selectors, query(published));

		expect(result.checkoutSnapshot.items[0].variantKey).toBe("print.variant:8x10");
	});

	it.each([
		["missing or unpublished", () => null],
		["wrong schema", () => ({ ...graph(), schemaVersion: 1 })],
		["wrong kind", () => ({ ...graph(), productKind: "postcard" })],
		["unavailable", () => ({ ...graph(), saleAvailability: "unavailable" })],
		[
			"duplicate matching variant",
			() => ({ ...graph(), variants: [...graph().variants, ...graph().variants] }),
		],
		["malformed product ID", () => ({ ...graph(), productId: "bad id" })],
		[
			"malformed variant key",
			() => ({ ...graph(), variants: [{ ...graph().variants[0], key: "bad key" }] }),
		],
		[
			"non-positive cents",
			() => ({ ...graph(), variants: [{ ...graph().variants[0], retailPriceCents: 0 }] }),
		],
		["missing primary media", () => ({ ...graph(), media: [] })],
		[
			"malformed media identity",
			() => ({
				...graph(),
				media: [{ ...graph().media[0], asset: { ...graph().media[0].asset, assetId: "forged" } }],
			}),
		],
	])("fails closed before bridge for %s", async (_label, value) => {
		await expect(
			resolveAuthoritativePrintSelection(selectors, query(value()) as never),
		).rejects.toMatchObject({
			status: expect.any(Number),
		});
	});
});
