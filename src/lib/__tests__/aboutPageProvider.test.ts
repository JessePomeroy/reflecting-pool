import { describe, expect, it, vi } from "vitest";
import { getFallbackAboutContent } from "$lib/server/content/about";
import {
	composeAboutPageDraftResult,
	type PublishedAboutPageState,
	parseAboutPageProviderMode,
	resolveAboutContent,
} from "$lib/server/content/aboutPageProvider";

function derivative(key: string, width: number) {
	return { key, width, height: Math.round(width * 1.5) };
}

function asset(id = "asset-public") {
	const prefix = `sites/zippymiggy.com/web/${id}`;
	return {
		assetId: id,
		source: { width: 3000, height: 4500 },
		derivatives: {
			thumb: derivative(`${prefix}/thumb.webp`, 320),
			card: derivative(`${prefix}/card.webp`, 768),
			display1280: derivative(`${prefix}/display-1280.webp`, 1280),
			display2048: derivative(`${prefix}/display-2048.webp`, 2048),
			display2560: derivative(`${prefix}/display-2560.webp`, 2560),
		},
	};
}

const legacy = getFallbackAboutContent();
const published: PublishedAboutPageState = {
	revisionId: "revision-123",
	publishedAt: 100,
	payload: {
		heading: "story",
		displayName: "Margaret Helena",
		role: "photographer and director",
		introduction: "CMS introduction",
		biography: "CMS biography",
		portraits: [
			{
				key: "second",
				order: 1,
				altText: "Second portrait",
				decorative: false,
				focalPoint: { x: 0.7, y: 0.4 },
				asset: asset("asset-second"),
			},
			{
				key: "first",
				order: 0,
				decorative: true,
				focalPoint: null,
				asset: asset("asset-first"),
			},
		],
		sections: [{ key: "practice", title: "practice", items: ["Photography"] }],
		highlights: [{ key: "based", label: "based in", value: "chicago" }],
		seoDescription: "CMS SEO",
		seoImage: asset("asset-seo"),
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

describe("About page provider", () => {
	it("defaults unset and unsupported modes to fallback", () => {
		expect(parseAboutPageProviderMode(undefined)).toEqual({ mode: "fallback", invalid: false });
		expect(parseAboutPageProviderMode("unsupported")).toEqual({ mode: "fallback", invalid: true });
	});

	it("does not query Convex in fallback mode", async () => {
		const deps = dependencies();
		await expect(resolveAboutContent("fallback", legacy, deps)).resolves.toBe(legacy);
		expect(deps.fetchPublishedCms).not.toHaveBeenCalled();
	});

	it("maps deliberate portrait order, responsive derivatives, focal points, and SEO image", async () => {
		const result = await resolveAboutContent("convex", legacy, dependencies());
		expect(result).toMatchObject({
			heading: "story",
			displayName: "Margaret Helena",
			role: "photographer and director",
			introduction: "CMS introduction",
			biography: "CMS biography",
			sections: [{ title: "practice", items: ["Photography"] }],
			highlights: [{ label: "based in", value: "chicago" }],
			seo: { description: "CMS SEO" },
		});
		expect(result.portraits.map((portrait) => portrait.key)).toEqual(["first", "second"]);
		expect(result.portraits[0]).toMatchObject({
			decorative: true,
			altText: "",
			focalPoint: { x: 0.5, y: 0.5 },
			width: 1280,
			height: 1920,
		});
		expect(result.portraits[1].srcset).toContain("display-2560.webp 2560w");
		expect(result.seo.ogImage).toContain("asset-seo/display-2048.webp");
		expect(result.socialLinks).toBe(legacy.socialLinks);
	});

	it("keeps fallback public in shadow mode and emits content-free mismatch telemetry", async () => {
		const deps = dependencies();
		await expect(resolveAboutContent("shadow", legacy, deps)).resolves.toBe(legacy);
		expect(deps.log).toHaveBeenCalledWith(
			expect.objectContaining({ event: "cms.shadow_mismatch", revisionId: "revision-123" }),
		);
		expect(JSON.stringify(deps.log.mock.calls)).not.toContain("CMS introduction");
	});

	it("fails closed in Convex mode and preserves fallback in shadow mode", async () => {
		const deps = dependencies({
			fetchPublishedCms: vi.fn().mockRejectedValue(new Error("secret")),
		});
		await expect(resolveAboutContent("shadow", legacy, deps)).resolves.toBe(legacy);
		await expect(resolveAboutContent("convex", legacy, deps)).rejects.toThrow(
			"Published CMS About page is unavailable",
		);
		expect(JSON.stringify(deps.log.mock.calls)).not.toContain("secret");
	});

	it("composes an authenticated draft from tenant media IDs without exposing masters", () => {
		const editorAsset = { _id: "convex-media-id", ...asset("public-asset-id") };
		const result = composeAboutPageDraftResult(
			legacy,
			{
				heading: "Draft",
				displayName: "Maggie",
				portraits: [
					{
						key: "portrait",
						assetId: "convex-media-id",
						altText: "Maggie near the water",
						decorative: false,
					},
				],
				seoImageAssetId: "convex-media-id",
			},
			[editorAsset],
		);
		expect(result.portraits[0].src).toContain("public-asset-id/display-1280.webp");
		expect(result.seo.ogImage).toContain("public-asset-id/display-2048.webp");
		expect(JSON.stringify(result)).not.toContain("convex-media-id");
	});
});
