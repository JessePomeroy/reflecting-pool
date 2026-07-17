import { describe, expect, it, vi } from "vitest";
import { getFallbackModelingPageContent } from "$lib/server/content/modeling";
import {
	composeModelingPageDraftResult,
	type PublishedModelingPageState,
	parseModelingPageProviderMode,
	resolveModelingPageContent,
} from "$lib/server/content/modelingPageProvider";

function derivative(key: string, width: number) {
	return { key, width, height: Math.round(width * 1.25) };
}

function asset(id = "asset-public") {
	const prefix = `sites/zippymiggy.com/web/${id}`;
	return {
		assetId: id,
		source: { width: 3000, height: 3750 },
		derivatives: {
			thumb: derivative(`${prefix}/thumb.webp`, 320),
			card: derivative(`${prefix}/card.webp`, 768),
			display1280: derivative(`${prefix}/display-1280.webp`, 1280),
			display2048: derivative(`${prefix}/display-2048.webp`, 2048),
			display2560: derivative(`${prefix}/display-2560.webp`, 2560),
		},
	};
}

const legacy = getFallbackModelingPageContent();
const published: PublishedModelingPageState = {
	revisionId: "revision-123",
	publishedAt: 100,
	payload: {
		heading: "modeling & acting",
		intro: "Selected work",
		galleries: [
			{
				key: "commercial",
				order: 1,
				title: "Commercial",
				slug: "commercial",
				images: [
					{
						key: "commercial-first",
						order: 0,
						altText: "Commercial portrait",
						asset: asset("commercial"),
					},
				],
			},
			{
				key: "editorial",
				order: 0,
				title: "Editorial",
				slug: "editorial",
				images: [
					{
						key: "editorial-first",
						order: 0,
						altText: "",
						asset: asset("editorial"),
					},
				],
			},
		],
		seoDescription: "Modeling portfolio",
	},
};

function dependencies(overrides: Record<string, unknown> = {}) {
	return {
		fetchPublishedCms: vi.fn().mockResolvedValue(published),
		log: vi.fn(),
		now: () => 100,
		siteUrl: "zippymiggy.com",
		...overrides,
	};
}

describe("Modeling page provider", () => {
	it("defaults unset and unsupported modes to fallback", () => {
		expect(parseModelingPageProviderMode(undefined)).toEqual({ mode: "fallback", invalid: false });
		expect(parseModelingPageProviderMode("unsupported")).toEqual({
			mode: "fallback",
			invalid: true,
		});
	});

	it("does not query Convex in fallback mode", async () => {
		const deps = dependencies();
		await expect(resolveModelingPageContent("fallback", legacy, deps)).resolves.toBe(legacy);
		expect(deps.fetchPublishedCms).not.toHaveBeenCalled();
	});

	it("maps ordered categories and responsive public derivatives", async () => {
		const result = await resolveModelingPageContent("convex", legacy, dependencies());
		expect(result.galleries.map((gallery) => gallery.slug)).toEqual(["editorial", "commercial"]);
		expect(result.galleries[0].images[0]).toMatchObject({
			id: "editorial-first",
			alt: "",
			width: 1280,
			height: 1600,
		});
		expect(result.galleries[0].images[0].srcset).toContain("display-2560.webp 2560w");
		expect(result.seo.ogImage).toBe(legacy.seo.ogImage);
	});

	it("keeps fallback public in shadow mode and fails closed in Convex mode", async () => {
		const deps = dependencies({
			fetchPublishedCms: vi.fn().mockRejectedValue(new Error("secret")),
		});
		await expect(resolveModelingPageContent("shadow", legacy, deps)).resolves.toBe(legacy);
		await expect(resolveModelingPageContent("convex", legacy, deps)).rejects.toThrow(
			"Published CMS Modeling page is unavailable",
		);
		expect(JSON.stringify(deps.log.mock.calls)).not.toContain("secret");
	});

	it("composes the visible draft only and never exposes editor media IDs", () => {
		const editorAsset = { _id: "convex-media-id", ...asset("public-asset-id") };
		const result = composeModelingPageDraftResult(
			legacy,
			{
				heading: "Draft",
				galleries: [
					{
						key: "visible",
						title: "Visible",
						slug: "visible",
						isVisible: true,
						images: [
							{
								key: "image",
								assetId: "convex-media-id",
								altText: "Portrait",
							},
						],
					},
					{ key: "hidden", title: "Hidden", slug: "hidden", isVisible: false },
				],
				seoDescription: "Draft SEO",
			},
			[editorAsset],
		);
		expect(result.galleries.map((gallery) => gallery.slug)).toEqual(["visible"]);
		expect(result.galleries[0].images[0].src).toContain("public-asset-id/display-1280.webp");
		expect(JSON.stringify(result)).not.toContain("convex-media-id");
	});
});
