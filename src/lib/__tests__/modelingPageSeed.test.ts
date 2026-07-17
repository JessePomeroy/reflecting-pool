import { describe, expect, it } from "vitest";
import { modelingPageSeed } from "$lib/content/modelingPageSeed";
import { getFallbackModelingPageContent } from "$lib/server/content/modeling";

describe("Modeling editor seed", () => {
	it("copies current public copy and category order without inventing CMS media IDs", () => {
		const fallback = getFallbackModelingPageContent();
		expect(modelingPageSeed.heading).toBe(fallback.heading);
		expect(modelingPageSeed.intro).toBe(fallback.intro);
		expect(modelingPageSeed.seoDescription).toBe(fallback.seo.description);
		expect(
			modelingPageSeed.galleries?.map((gallery) => ({
				title: gallery.title,
				slug: gallery.slug,
			})),
		).toEqual(fallback.galleries.map(({ title, slug }) => ({ title, slug })));
		expect(
			modelingPageSeed.galleries?.every(
				(gallery) => gallery.isVisible === false && gallery.images?.length === 0,
			),
		).toBe(true);
	});
});
