import { afterEach, describe, expect, it, vi } from "vitest";

async function importSiteConfig(options: { dev: boolean; publicSiteUrl: string }) {
	vi.resetModules();
	vi.doMock("$app/environment", () => ({
		browser: false,
		building: false,
		dev: options.dev,
		version: "test",
	}));
	vi.doMock("$env/static/public", () => ({
		PUBLIC_SITE_URL: options.publicSiteUrl,
	}));

	return import("$lib/config/site");
}

describe("site config", () => {
	afterEach(() => {
		vi.doUnmock("$app/environment");
		vi.doUnmock("$env/static/public");
		vi.resetModules();
	});

	it("uses the code-owned canonical origin in production builds", async () => {
		const { SITE_URL, SITEMAP_URL, siteUrlForPath } = await importSiteConfig({
			dev: false,
			publicSiteUrl: "http://localhost:5173",
		});

		expect(SITE_URL).toBe("https://margarethelena.com");
		expect(SITEMAP_URL).toBe("https://margarethelena.com/sitemap.xml");
		expect(siteUrlForPath("/shop/")).toBe("https://margarethelena.com/shop");
	});

	it("uses PUBLIC_SITE_URL during local development", async () => {
		const { SITE_URL, SITEMAP_URL, siteUrlForPath } = await importSiteConfig({
			dev: true,
			publicSiteUrl: "http://localhost:5173/",
		});

		expect(SITE_URL).toBe("http://localhost:5173");
		expect(SITEMAP_URL).toBe("http://localhost:5173/sitemap.xml");
		expect(siteUrlForPath("/about")).toBe("http://localhost:5173/about");
	});
});
