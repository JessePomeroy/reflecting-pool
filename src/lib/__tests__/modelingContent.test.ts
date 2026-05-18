import { describe, expect, it } from "vitest";
import {
	getFallbackModelingPageContent,
	type ModelingPageContent,
	normalizeModelingPageContent,
} from "$lib/server/content/modeling";

describe("normalizeModelingPageContent", () => {
	it("uses fallback content when Sanity fields are missing", () => {
		expect(normalizeModelingPageContent({})).toEqual(getFallbackModelingPageContent());
	});

	it("preserves valid Sanity galleries and filters incomplete galleries/images", () => {
		const result = normalizeModelingPageContent({
			eyebrow: "portfolio",
			heading: "fashion editorial",
			intro: "Custom intro",
			galleries: [
				{
					title: "Fashion Editorial",
					slug: "fashion-editorial",
					description: "Editorial selects",
					images: [
						{
							id: "image-01",
							src: "https://cdn.sanity.io/image-01.jpg",
							alt: "",
						},
						{
							id: "",
							src: "",
							alt: "drop me",
						},
					],
				},
				{
					title: "No images",
					slug: "no-images",
					images: [],
				},
			],
			seo: {
				description: "Custom SEO",
				ogImage: "https://cdn.sanity.io/og.jpg",
			},
		} satisfies Partial<ModelingPageContent>);

		expect(result.eyebrow).toBe("portfolio");
		expect(result.heading).toBe("fashion editorial");
		expect(result.intro).toBe("Custom intro");
		expect(result.galleries).toEqual([
			{
				title: "Fashion Editorial",
				slug: "fashion-editorial",
				description: "Editorial selects",
				images: [
					{
						id: "image-01",
						src: "https://cdn.sanity.io/image-01.jpg",
						alt: "Fashion Editorial",
					},
				],
			},
		]);
		expect(result.seo).toEqual({
			description: "Custom SEO",
			ogImage: "https://cdn.sanity.io/og.jpg",
		});
	});

	it("falls back to default galleries when Sanity galleries normalize to empty", () => {
		const result = normalizeModelingPageContent({
			galleries: [
				{
					title: "Missing slug",
					slug: "",
					images: [{ id: "image-01", src: "/image.jpg", alt: "Image" }],
				},
			],
		});

		expect(result.galleries).toEqual(getFallbackModelingPageContent().galleries);
	});
});
