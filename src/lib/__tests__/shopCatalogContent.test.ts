import { describe, expect, it } from "vitest";
import {
	fetchCollections,
	fetchCollectionWithPrints,
	fetchPrintableProducts,
	fetchPrintProduct,
	getFallbackCollectionWithPrints,
	getFallbackPrintCollections,
	getFallbackPrintProducts,
} from "$lib/server/content/shopCatalog";

describe("shop catalog content", () => {
	it("returns fallback print collections while the Sanity print catalog is pending", async () => {
		await expect(fetchCollections()).resolves.toEqual(getFallbackPrintCollections());
	});

	it("returns fallback printable products with stable slugs and size options", async () => {
		const products = await fetchPrintableProducts();
		const first = products[0];

		expect(products).toEqual(getFallbackPrintProducts());
		expect(first.slug).toBe("wildflowers--img-01");
		expect(first.availableSizes.length).toBeGreaterThan(0);
	});

	it("returns a collection with only prints from that collection", async () => {
		const result = await fetchCollectionWithPrints("garden-portraits");

		expect(result).toEqual(getFallbackCollectionWithPrints("garden-portraits"));
		expect(result?.collection.slug).toBe("garden-portraits");
		expect(result?.prints.every((print) => print.gallerySlug === "garden-portraits")).toBe(true);
	});

	it("returns null for unknown collection and product slugs", async () => {
		await expect(fetchCollectionWithPrints("missing")).resolves.toBeNull();
		await expect(fetchPrintProduct("missing")).resolves.toBeNull();
	});

	it("returns a single fallback print product by slug", async () => {
		const product = await fetchPrintProduct("moody-blooms--img-24");

		expect(product).toMatchObject({
			id: "img-24",
			title: "Bruised Petals",
			gallerySlug: "moody-blooms",
		});
	});
});
