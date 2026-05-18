import { describe, expect, it } from "vitest";
import { getFallbackAboutContent, normalizeAboutContent } from "$lib/server/content/about";

describe("normalizeAboutContent", () => {
	it("uses fallback content when Sanity fields are missing", () => {
		expect(normalizeAboutContent({})).toEqual(getFallbackAboutContent());
	});

	it("preserves Sanity profile content and filters incomplete repeaters", () => {
		const result = normalizeAboutContent({
			about: {
				heading: "custom about",
				name: "Maggie",
				shortBio: "Photographer and director.",
				portrait: "https://cdn.sanity.io/portrait.jpg",
				sections: [
					{ title: "valid", items: ["one", ""] },
					{ title: "", items: ["dropped"] },
					{ title: "empty", items: [] },
				],
				highlights: [
					{ label: "based in", value: "chicago" },
					{ label: "missing value", value: "" },
				],
				seo: { description: "Custom SEO" },
			},
		});

		expect(result.heading).toBe("custom about");
		expect(result.portrait).toBe("https://cdn.sanity.io/portrait.jpg");
		expect(result.bio).toBe("Maggie\n\nPhotographer and director.");
		expect(result.sections).toEqual([{ title: "valid", items: ["one"] }]);
		expect(result.highlights).toEqual([{ label: "based in", value: "chicago" }]);
		expect(result.seo.description).toBe("Custom SEO");
		expect(result.seo.ogImage).toBe(getFallbackAboutContent().seo.ogImage);
	});

	it("prefers site settings social links before legacy about social fields", () => {
		const result = normalizeAboutContent({
			about: {
				social: {
					instagram: "https://www.instagram.com/legacy/",
					email: "hello@example.com",
				},
			},
			settings: {
				socialLinks: [
					{ platform: "instagram", url: "https://www.instagram.com/zippymiggy/" },
					{ platform: "", url: "https://example.com/drop-me" },
				],
			},
		});

		expect(result.socialLinks).toEqual([
			{ platform: "instagram", url: "https://www.instagram.com/zippymiggy/" },
		]);
	});

	it("uses legacy about social links when site settings are missing", () => {
		const result = normalizeAboutContent({
			about: {
				social: {
					instagram: "https://www.instagram.com/zippymiggy/",
					email: "hello@example.com",
				},
			},
		});

		expect(result.socialLinks).toEqual([
			{ platform: "instagram", url: "https://www.instagram.com/zippymiggy/" },
			{ platform: "email", url: "mailto:hello@example.com" },
		]);
	});
});
