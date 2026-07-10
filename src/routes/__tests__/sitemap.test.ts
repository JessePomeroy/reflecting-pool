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

async function importSitemapRouteWithRejectedCollections(
	products: Pick<PrintProduct, "slug">[] = [],
) {
	vi.resetModules();
	vi.doMock("$lib/server/content/shopCatalog", () => ({
		fetchCollections: vi.fn().mockRejectedValue(new Error("catalog unavailable")),
		fetchPrintableProducts: vi.fn().mockResolvedValue(products),
	}));

	return importSitemapRoute();
}

async function importSitemapRouteWithRejectedProducts(
	collections: Pick<PrintCollection, "slug">[] = [],
) {
	vi.resetModules();
	vi.doMock("$lib/server/content/shopCatalog", () => ({
		fetchCollections: vi.fn().mockResolvedValue(collections),
		fetchPrintableProducts: vi.fn().mockRejectedValue(new Error("products unavailable")),
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
			"<loc>https://margarethelena.com/shop/collection/wildflowers%26roses</loc>",
		);
		expect(xml).toContain("<loc>https://margarethelena.com/shop/print%22study</loc>");
		expect(xml).toContain("<loc>https://margarethelena.com/shop/print%3Cstudy%3E</loc>");
		expect(locCount(xml, "https://margarethelena.com/shop/collection/wildflowers%26roses")).toBe(1);
	});

	it("keeps static sitemap URLs available when dynamic shop content fails", async () => {
		const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);
		const { GET } = await importSitemapRouteWithRejectedCollections();
		const response = await GET({} as Parameters<typeof GET>[0]);
		const xml = await response.text();

		expect(response.status).toBe(200);
		expect(xml).toContain("<loc>https://margarethelena.com/</loc>");
		expect(xml).toContain("<loc>https://margarethelena.com/about</loc>");
		expect(xml).toContain("<loc>https://margarethelena.com/shop</loc>");
		expect(warnSpy).toHaveBeenCalledWith(
			"[sitemap] failed to load collection URLs",
			expect.any(Error),
		);
	});

	it("keeps product URLs when collection URLs fail", async () => {
		const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);
		const { GET } = await importSitemapRouteWithRejectedCollections([{ slug: "surviving-print" }]);
		const response = await GET({} as Parameters<typeof GET>[0]);
		const xml = await response.text();

		expect(response.status).toBe(200);
		expect(xml).toContain("<loc>https://margarethelena.com/shop/surviving-print</loc>");
		expect(warnSpy).toHaveBeenCalledWith(
			"[sitemap] failed to load collection URLs",
			expect.any(Error),
		);
	});

	it("keeps collection URLs when product URLs fail", async () => {
		const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);
		const { GET } = await importSitemapRouteWithRejectedProducts([
			{ slug: "surviving-collection" },
		]);
		const response = await GET({} as Parameters<typeof GET>[0]);
		const xml = await response.text();

		expect(response.status).toBe(200);
		expect(xml).toContain(
			"<loc>https://margarethelena.com/shop/collection/surviving-collection</loc>",
		);
		expect(warnSpy).toHaveBeenCalledWith(
			"[sitemap] failed to load product URLs",
			expect.any(Error),
		);
	});
});
