import { describe, expect, it } from "vitest";

describe("robots.txt", () => {
	it("advertises the canonical sitemap URL", async () => {
		const { GET } = await import("../robots.txt/+server");
		const response = await GET({} as Parameters<typeof GET>[0]);
		const text = await response.text();

		expect(response.headers.get("Content-Type")).toBe("text/plain; charset=utf-8");
		expect(response.headers.get("Cache-Control")).toBe("max-age=3600");
		expect(text).toContain("User-agent: *");
		expect(text).toContain("Disallow: /admin");
		expect(text).toContain("Disallow: /api");
		expect(text).toContain("Sitemap: https://margarethelena.com/sitemap.xml");
	});
});
