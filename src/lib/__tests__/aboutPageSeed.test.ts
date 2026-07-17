import { describe, expect, it } from "vitest";
import { aboutPageSeed } from "$lib/content/aboutPageSeed";
import { getFallbackAboutContent } from "$lib/server/content/about";

describe("About editor seed", () => {
	it("copies the current host-owned text without pretending static files are CMS assets", () => {
		const fallback = getFallbackAboutContent();
		expect(aboutPageSeed.heading).toBe(fallback.heading);
		expect(aboutPageSeed.sections?.map(({ title, items }) => ({ title, items }))).toEqual(
			fallback.sections,
		);
		expect(aboutPageSeed.highlights?.map(({ label, value }) => ({ label, value }))).toEqual(
			fallback.highlights,
		);
		expect(aboutPageSeed.seoDescription).toBe(fallback.seo.description);
		expect(aboutPageSeed.portraits).toEqual([]);
	});
});
