import { describe, expect, it } from "vitest";
import { portfolioDraftPreviewCluster } from "$lib/server/content/portfolioPreview";

function derivatives(prefix: string) {
	return {
		thumb: { key: `${prefix}/thumb.webp`, width: 320, height: 213 },
		card: { key: `${prefix}/card.webp`, width: 768, height: 512 },
		display1280: { key: `${prefix}/display-1280.webp`, width: 1280, height: 853 },
		display2048: { key: `${prefix}/display-2048.webp`, width: 2048, height: 1365 },
		display2560: { key: `${prefix}/display-2560.webp`, width: 2560, height: 1707 },
	};
}

describe("portfolio draft preview projection", () => {
	it("preserves deliberate order and emits immutable public image URLs", () => {
		const input = {
			galleryId: "gallery-1",
			title: "Selected work",
			slug: "selected-work",
			placements: [
				{ key: "second", assetId: "media-2", altText: null },
				{ key: "first", assetId: "media-1", altText: "A portrait" },
			],
			assets: [
				{
					_id: "media-1",
					assetId: "asset-1",
					derivatives: derivatives("sites/zippymiggy.com/web/asset-1"),
				},
				{
					_id: "media-2",
					assetId: "asset-2",
					derivatives: derivatives("sites/zippymiggy.com/web/asset 2"),
				},
			],
		};
		const first = portfolioDraftPreviewCluster(input);
		const retry = portfolioDraftPreviewCluster(input);

		expect(first.images.map(({ alt }) => alt)).toEqual(["", "A portrait"]);
		expect(first.images[0].src).toBe(
			"https://media.angelsrest.online/sites/zippymiggy.com/web/asset%202/display-1280.webp",
		);
		expect(first.images[0].srcset).toContain(
			"https://media.angelsrest.online/sites/zippymiggy.com/web/asset%202/thumb.webp 320w",
		);
		expect(retry).toEqual(first);
	});

	it("rejects a placement whose asset was not returned by the authorized query", () => {
		expect(() =>
			portfolioDraftPreviewCluster({
				galleryId: "gallery-1",
				title: "Selected work",
				slug: "selected-work",
				placements: [{ key: "missing", assetId: "media-missing" }],
				assets: [],
			}),
		).toThrow(/unavailable/);
	});
});
