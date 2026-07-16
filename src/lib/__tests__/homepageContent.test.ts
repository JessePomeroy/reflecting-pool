import { describe, expect, it } from "vitest";
import { homepageQuoteSeed } from "$lib/content/homepageQuoteSeed";
import {
	getFallbackHomepageContent,
	type HomepageContent,
	normalizeHomepageContent,
} from "$lib/server/content/homepage";

describe("normalizeHomepageContent", () => {
	it("uses fallback content when Sanity fields are missing", () => {
		expect(normalizeHomepageContent({})).toEqual(getFallbackHomepageContent());
		expect(getFallbackHomepageContent().quote).toEqual(homepageQuoteSeed);
	});

	it("preserves provided Sanity content while filling missing nested fields", () => {
		const result = normalizeHomepageContent({
			practiceLine: "Custom practice line",
			quote: { text: "Custom quote", attribution: "" },
			navLinks: [{ label: "custom", href: "/custom" }],
			seo: { description: "Custom description" },
		});

		expect(result.practiceLine).toBe("Custom practice line");
		expect(result.quote.text).toBe("Custom quote");
		expect(result.quote.attribution).toBe(getFallbackHomepageContent().quote.attribution);
		expect(result.navLinks).toEqual([{ label: "custom", href: "/custom" }]);
		expect(result.seo.description).toBe("Custom description");
	});

	it("falls back to default navigation when Sanity returns no links", () => {
		const result = normalizeHomepageContent({
			navLinks: [],
		} satisfies Partial<HomepageContent>);

		expect(result.navLinks).toEqual(getFallbackHomepageContent().navLinks);
	});
});
