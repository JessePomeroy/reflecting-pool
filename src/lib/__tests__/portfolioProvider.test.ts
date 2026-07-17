import { describe, expect, it, vi } from "vitest";
import {
	type PublishedPortfolioGallery,
	parsePortfolioProviderMode,
	publishedPortfolioClusters,
	resolvePortfolio,
} from "$lib/server/content/portfolioProvider";
import type { GalleryCluster } from "$lib/types/gallery";

const fallback: GalleryCluster[] = [
	{
		id: "fallback",
		title: "Fallback flowers",
		slug: "fallback",
		images: [
			{
				src: "/images/flower-01.jpg",
				alt: "Fallback flower",
				depth: 0.5,
				offsetX: 0,
				offsetY: 0,
				rotation: 0,
				scale: 1,
			},
		],
	},
];

function asset(assetId: string, path = assetId) {
	const prefix = `sites/zippymiggy.com/web/${path}`;
	return {
		assetId,
		derivatives: {
			thumb: { key: `${prefix}/thumb.webp`, width: 320, height: 213 },
			card: { key: `${prefix}/card.webp`, width: 768, height: 512 },
			display1280: { key: `${prefix}/display-1280.webp`, width: 1280, height: 853 },
			display2048: { key: `${prefix}/display-2048.webp`, width: 2048, height: 1365 },
			display2560: { key: `${prefix}/display-2560.webp`, width: 2560, height: 1707 },
		},
	};
}

const published: PublishedPortfolioGallery[] = [
	{
		galleryId: "gallery-second",
		revisionId: "revision-second",
		title: "Second",
		slug: "second",
		portfolioOrder: 1,
		placements: [
			{
				key: "portrait",
				order: 0,
				altText: "Portrait in window light",
				asset: asset("asset-2", "asset 2"),
			},
		],
	},
	{
		galleryId: "gallery-first",
		revisionId: "revision-first",
		title: "First",
		slug: "first",
		portfolioOrder: 0,
		placements: [
			{
				key: "detail",
				order: 0,
				altText: "",
				asset: asset("asset-1"),
			},
		],
	},
];

function dependencies(overrides: Record<string, unknown> = {}) {
	return {
		fetchFallback: vi.fn().mockResolvedValue(fallback),
		fetchPublishedCms: vi.fn().mockResolvedValue(published),
		log: vi.fn(),
		now: () => 100,
		siteUrl: "zippymiggy.com",
		...overrides,
	};
}

describe("Portfolio provider", () => {
	it("defaults unset and unsupported modes to fallback", () => {
		expect(parsePortfolioProviderMode(undefined)).toEqual({ mode: "fallback", invalid: false });
		expect(parsePortfolioProviderMode("unsupported")).toEqual({
			mode: "fallback",
			invalid: true,
		});
	});

	it("returns fallback without querying Convex in fallback mode", async () => {
		const deps = dependencies();

		await expect(resolvePortfolio("fallback", deps)).resolves.toBe(fallback);
		expect(deps.fetchPublishedCms).not.toHaveBeenCalled();
		expect(deps.log).toHaveBeenCalledWith(
			expect.objectContaining({
				event: "cms.public_read_succeeded",
				provider: "fallback",
				galleryCount: 1,
				imageCount: 1,
			}),
		);
	});

	it("keeps serving fallback and emits content-free mismatch telemetry in shadow mode", async () => {
		const deps = dependencies();

		await expect(resolvePortfolio("shadow", deps)).resolves.toBe(fallback);
		expect(deps.log).toHaveBeenCalledWith(
			expect.objectContaining({
				event: "cms.shadow_mismatch",
				provider: "shadow",
				revisionId: expect.stringMatching(/^set:2:[0-9a-f]{8}$/),
				galleryCount: 2,
				imageCount: 2,
			}),
		);
		expect(JSON.stringify(deps.log.mock.calls)).not.toContain("Portrait in window light");
	});

	it("keeps serving fallback when the shadow query is unavailable", async () => {
		const deps = dependencies({
			fetchPublishedCms: vi.fn().mockRejectedValue(new Error("private upstream details")),
		});

		await expect(resolvePortfolio("shadow", deps)).resolves.toBe(fallback);
		expect(deps.log).toHaveBeenCalledWith(
			expect.objectContaining({
				event: "cms.shadow_unavailable",
				code: "convex_query_failed",
			}),
		);
		expect(JSON.stringify(deps.log.mock.calls)).not.toContain("private upstream details");
	});

	it("maps the authoritative public snapshot in gallery and placement order", async () => {
		const deps = dependencies();
		const result = await resolvePortfolio("convex", deps);

		expect(result.map(({ id }) => id)).toEqual(["gallery-first", "gallery-second"]);
		expect(result[0].images[0].alt).toBe("");
		expect(result[1].images[0].src).toBe(
			"https://media.angelsrest.online/sites/zippymiggy.com/web/asset%202/display-1280.webp",
		);
		expect(result[1].images[0].srcset).toContain("/asset%202/thumb.webp 320w");
		expect(deps.fetchFallback).not.toHaveBeenCalled();
		expect(deps.log).toHaveBeenCalledWith(
			expect.objectContaining({
				event: "cms.public_read_succeeded",
				provider: "convex",
				galleryCount: 2,
				imageCount: 2,
			}),
		);
	});

	it("treats an empty authoritative portfolio as a valid published state", async () => {
		const deps = dependencies({ fetchPublishedCms: vi.fn().mockResolvedValue([]) });

		await expect(resolvePortfolio("convex", deps)).resolves.toEqual([]);
		expect(deps.log).toHaveBeenCalledWith(
			expect.objectContaining({
				event: "cms.public_read_succeeded",
				galleryCount: 0,
				imageCount: 0,
			}),
		);
	});

	it("fails closed in convex mode when the public query is unavailable", async () => {
		const deps = dependencies({
			fetchPublishedCms: vi.fn().mockRejectedValue(new Error("upstream")),
		});

		await expect(resolvePortfolio("convex", deps)).rejects.toThrow(
			"Published CMS portfolio is unavailable",
		);
		expect(deps.log).toHaveBeenCalledWith(
			expect.objectContaining({
				event: "cms.public_read_failed",
				code: "convex_query_failed",
			}),
		);
	});

	it("builds the same deterministic projection for repeated reads", () => {
		expect(publishedPortfolioClusters(published)).toEqual(publishedPortfolioClusters(published));
	});
});
