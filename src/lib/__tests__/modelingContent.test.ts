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

	it("keeps at most ten ordered images per modeling category", () => {
		const images = Array.from({ length: 12 }, (_, index) => ({
			id: `image-${index + 1}`,
			src: `/image-${index + 1}.jpg`,
			alt: `Image ${index + 1}`,
		}));

		const result = normalizeModelingPageContent({
			galleries: [{ title: "Editorial", slug: "editorial", images }],
		});

		expect(result.galleries[0]?.images).toHaveLength(10);
		expect(result.galleries[0]?.images.at(-1)?.id).toBe("image-10");
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
