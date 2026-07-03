import { afterEach, describe, expect, it, vi } from "vitest";
import type { PrintCollection, PrintProduct } from "$lib/shop/types";

async function importSitemapRoute() {
	return import("../sitemap.xml/+server");
}

async function importSitemapRouteWithCatalog(
	collections: Pick<PrintCollection, "slug">[],
	products: Pick<PrintProduct, "slug">[],
) {
	vi.resetModules();
	vi.doMock("$lib/server/content/shopCatalog", () => ({
		fetchCollections: vi.fn().mockResolvedValue(collections),
		fetchPrintableProducts: vi.fn().mockResolvedValue(products),
	}));

	return importSitemapRoute();
}

async function importSitemapRouteWithRejectedCatalog() {
	vi.resetModules();
	vi.doMock("$lib/server/content/shopCatalog", () => ({
		fetchCollections: vi.fn().mockRejectedValue(new Error("catalog unavailable")),
		fetchPrintableProducts: vi.fn().mockResolvedValue([]),
	}));

	return importSitemapRoute();
}

function locCount(xml: string, loc: string) {
	return xml.match(new RegExp(`<loc>${loc}</loc>`, "g"))?.length ?? 0;
}

describe("sitemap", () => {
	afterEach(() => {
		vi.doUnmock("$lib/server/content/shopCatalog");
		vi.restoreAllMocks();
		vi.resetModules();
	});

	it("includes static, collection, and printable product URLs", async () => {
		const { GET } = await importSitemapRoute();
		const response = await GET({} as Parameters<typeof GET>[0]);
		const xml = await response.text();

		expect(response.headers.get("Content-Type")).toBe("application/xml");
		expect(response.headers.get("Cache-Control")).toBe("max-age=3600");
		expect(xml).toContain("<loc>https://margarethelena.com/</loc>");
		expect(xml).toContain("<loc>https://margarethelena.com/shop</loc>");
		expect(xml).toContain("<loc>https://margarethelena.com/shop/collection/wildflowers</loc>");
		expect(xml).toContain("<loc>https://margarethelena.com/shop/wildflowers--img-01</loc>");
		expect(xml.match(/<loc>/g)?.length).toBeGreaterThan(10);
	});

	it("escapes XML and removes duplicate dynamic URLs", async () => {
		const { GET } = await importSitemapRouteWithCatalog(
			[{ slug: "wildflowers&roses" }, { slug: "wildflowers&roses" }],
			[{ slug: 'print"study' }, { slug: "print<study>" }],
		);
		const response = await GET({} as Parameters<typeof GET>[0]);
		const xml = await response.text();

		expect(xml).toContain(
			"<loc>https://margarethelena.com/shop/collection/wildflowers&amp;roses</loc>",
		);
		expect(xml).toContain("<loc>https://margarethelena.com/shop/print&quot;study</loc>");
		expect(xml).toContain("<loc>https://margarethelena.com/shop/print&lt;study&gt;</loc>");
		expect(locCount(xml, "https://margarethelena.com/shop/collection/wildflowers&amp;roses")).toBe(
			1,
		);
	});

	it("keeps static sitemap URLs available when dynamic shop content fails", async () => {
		const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);
		const { GET } = await importSitemapRouteWithRejectedCatalog();
		const response = await GET({} as Parameters<typeof GET>[0]);
		const xml = await response.text();

		expect(response.status).toBe(200);
		expect(xml).toContain("<loc>https://margarethelena.com/</loc>");
		expect(xml).toContain("<loc>https://margarethelena.com/about</loc>");
		expect(xml).toContain("<loc>https://margarethelena.com/shop</loc>");
		expect(warnSpy).toHaveBeenCalledWith(
			"[sitemap] failed to load dynamic shop URLs",
			expect.any(Error),
		);
	});
});
