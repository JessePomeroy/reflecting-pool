import { describe, expect, it } from "vitest";
import { portfolioDraftPreviewCluster } from "$lib/server/content/portfolioPreview";

describe("portfolio draft preview projection", () => {
	it("preserves deliberate order and emits immutable public image URLs", () => {
		const input = {
			galleryId: "gallery-1",
			title: "Selected work",
			slug: "selected-work",
			placements: [
				{ key: "second", assetId: "media-2", altText: null, decorative: true },
				{ key: "first", assetId: "media-1", altText: "A portrait", decorative: false },
			],
			assets: [
				{
					_id: "media-1",
					assetId: "asset-1",
					derivatives: {
						display1280: { key: "sites/zippymiggy.com/web/asset-1/display-1280.webp" },
					},
				},
				{
					_id: "media-2",
					assetId: "asset-2",
					derivatives: {
						display1280: { key: "sites/zippymiggy.com/web/asset 2/display-1280.webp" },
					},
				},
			],
		};
		const first = portfolioDraftPreviewCluster(input);
		const retry = portfolioDraftPreviewCluster(input);

		expect(first.images.map(({ alt }) => alt)).toEqual(["", "A portrait"]);
		expect(first.images[0].src).toBe(
			"https://media.angelsrest.online/sites/zippymiggy.com/web/asset%202/display-1280.webp",
		);
		expect(retry).toEqual(first);
	});

	it("rejects a placement whose asset was not returned by the authorized query", () => {
		expect(() =>
			portfolioDraftPreviewCluster({
				galleryId: "gallery-1",
				title: "Selected work",
				slug: "selected-work",
				placements: [{ key: "missing", assetId: "media-missing", decorative: true }],
				assets: [],
			}),
		).toThrow(/unavailable/);
	});
});
