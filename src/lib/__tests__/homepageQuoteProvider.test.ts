import { describe, expect, it, vi } from "vitest";
import type { HomepageContent } from "$lib/server/content/homepage";
import {
	type PublishedHomepageQuoteState,
	parseHomepageQuoteProviderMode,
	resolveHomepageContent,
} from "$lib/server/content/homepageQuoteProvider";

const legacy: HomepageContent = {
	practiceLine: "Legacy practice line",
	quote: { text: "Legacy quote", attribution: "Legacy artist" },
	navLinks: [{ label: "about", href: "/about" }],
	seo: { description: "Legacy SEO", ogImage: "https://cdn.sanity.io/legacy.jpg" },
};

const published: PublishedHomepageQuoteState = {
	revisionId: "revision-123",
	publishedAt: 100,
	payload: { text: "CMS quote", attribution: "CMS artist" },
};

function dependencies(overrides: Record<string, unknown> = {}) {
	return {
		fetchLegacy: vi.fn().mockResolvedValue(legacy),
		fetchPublishedCms: vi.fn().mockResolvedValue(published),
		log: vi.fn(),
		now: () => 100,
		siteUrl: "zippymiggy.com",
		...overrides,
	};
}

describe("Homepage Quote provider", () => {
	it("defaults unset and unsupported modes to fallback", () => {
		expect(parseHomepageQuoteProviderMode(undefined)).toEqual({ mode: "fallback", invalid: false });
		expect(parseHomepageQuoteProviderMode("unsupported")).toEqual({
			mode: "fallback",
			invalid: true,
		});
	});

	it("returns legacy content without querying Convex in fallback mode", async () => {
		const deps = dependencies();
		await expect(resolveHomepageContent("fallback", deps)).resolves.toBe(legacy);
		expect(deps.fetchPublishedCms).not.toHaveBeenCalled();
		expect(deps.log).toHaveBeenCalledWith(
			expect.objectContaining({
				event: "cms.public_read_succeeded",
				provider: "fallback",
				kind: "homepageQuote",
			}),
		);
	});

	it("returns legacy content and content-free mismatch telemetry in shadow mode", async () => {
		const deps = dependencies();
		await expect(resolveHomepageContent("shadow", deps)).resolves.toBe(legacy);
		expect(deps.log).toHaveBeenCalledWith(
			expect.objectContaining({
				event: "cms.shadow_mismatch",
				revisionId: "revision-123",
			}),
		);
		expect(JSON.stringify(deps.log.mock.calls)).not.toContain(published.payload.text);
	});

	it("matches named quote fields regardless of provider object key order", async () => {
		const deps = dependencies({
			fetchPublishedCms: vi.fn().mockResolvedValue({
				revisionId: "revision-same",
				publishedAt: 100,
				payload: {
					attribution: legacy.quote.attribution,
					text: legacy.quote.text,
				},
			}),
		});

		await expect(resolveHomepageContent("shadow", deps)).resolves.toBe(legacy);
		expect(deps.log).toHaveBeenCalledWith(
			expect.objectContaining({
				event: "cms.shadow_match",
				revisionId: "revision-same",
			}),
		);
	});

	it("keeps serving legacy content when the shadow read is unavailable", async () => {
		const deps = dependencies({
			fetchPublishedCms: vi.fn().mockRejectedValue(new Error("upstream details must not log")),
		});
		await expect(resolveHomepageContent("shadow", deps)).resolves.toBe(legacy);
		expect(deps.log).toHaveBeenCalledWith(
			expect.objectContaining({
				event: "cms.shadow_unavailable",
				code: "convex_query_failed",
			}),
		);
		expect(JSON.stringify(deps.log.mock.calls)).not.toContain("upstream details");
	});

	it("replaces only the quote when Convex is authoritative", async () => {
		const deps = dependencies();
		await expect(resolveHomepageContent("convex", deps)).resolves.toEqual({
			...legacy,
			quote: published.payload,
		});
		expect(deps.log).toHaveBeenCalledWith(
			expect.objectContaining({
				event: "cms.public_read_succeeded",
				provider: "convex",
				revisionId: "revision-123",
			}),
		);
	});

	it("fails closed when Convex mode has no published quote", async () => {
		const deps = dependencies({ fetchPublishedCms: vi.fn().mockResolvedValue(null) });
		await expect(resolveHomepageContent("convex", deps)).rejects.toThrow(
			"Published CMS Homepage Quote is unavailable",
		);
		expect(deps.log).toHaveBeenCalledWith(
			expect.objectContaining({
				event: "cms.public_read_failed",
				code: "published_revision_missing",
			}),
		);
	});
});
