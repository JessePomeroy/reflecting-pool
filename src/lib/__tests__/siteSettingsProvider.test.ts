import { describe, expect, it, vi } from "vitest";
import type { SiteSettingsResult } from "$lib/server/content/siteSettings";
import {
	type PublishedCmsSiteSettings,
	type PublishedCmsSiteSettingsState,
	parseSiteSettingsProviderMode,
	resolveSiteSettings,
} from "$lib/server/content/siteSettingsProvider";

const legacyResult: SiteSettingsResult = {
	site: {
		artistName: "Legacy name",
		siteTitle: "Legacy title",
		tagline: "Legacy tagline",
		socialLinks: [{ platform: "instagram", url: "https://example.com/legacy" }],
		seo: {
			description: "Legacy SEO",
			ogImage: "https://cdn.sanity.io/legacy-og.jpg",
		},
	},
	contact: {
		heading: "Contact",
		intro: "Legacy contact remains",
		email: "hello@example.com",
		booking: {
			enabled: false,
			label: "book",
			intro: "Booking intro",
			calConfig: "{}",
		},
	},
};

const publishedCms: PublishedCmsSiteSettings = {
	artistName: "CMS name",
	siteTitle: "CMS title",
	tagline: "CMS published tagline",
	socialLinks: [{ platform: "bluesky", url: "https://example.com/cms" }],
	seoDescription: "CMS SEO",
};

const publishedCmsState: PublishedCmsSiteSettingsState = {
	revisionId: "revision-123",
	publishedAt: 100,
	payload: publishedCms,
};

function dependencies(overrides: Record<string, unknown> = {}) {
	return {
		fetchLegacy: vi.fn().mockResolvedValue(legacyResult),
		fetchPublishedCms: vi.fn().mockResolvedValue(publishedCmsState),
		log: vi.fn(),
		now: () => 100,
		siteUrl: "zippymiggy.com",
		...overrides,
	};
}

describe("Site settings provider", () => {
	it("defaults unset and unsupported modes to fallback", () => {
		expect(parseSiteSettingsProviderMode(undefined)).toEqual({ mode: "fallback", invalid: false });
		expect(parseSiteSettingsProviderMode("unsupported")).toEqual({
			mode: "fallback",
			invalid: true,
		});
	});

	it("returns the legacy provider without querying Convex in fallback mode", async () => {
		const deps = dependencies();

		await expect(resolveSiteSettings("fallback", deps)).resolves.toBe(legacyResult);
		expect(deps.fetchPublishedCms).not.toHaveBeenCalled();
		expect(deps.log).toHaveBeenCalledWith(
			expect.objectContaining({
				event: "cms.public_read_succeeded",
				provider: "fallback",
				site: "zippymiggy.com",
			}),
		);
	});

	it("returns legacy data and emits content-free mismatch telemetry in shadow mode", async () => {
		const deps = dependencies();

		await expect(resolveSiteSettings("shadow", deps)).resolves.toBe(legacyResult);
		expect(deps.log).toHaveBeenCalledWith(
			expect.objectContaining({
				event: "cms.shadow_mismatch",
				provider: "shadow",
				revisionId: "revision-123",
			}),
		);
		expect(JSON.stringify(deps.log.mock.calls)).not.toContain(publishedCms.tagline);
	});

	it("keeps serving legacy data when the shadow read is unavailable", async () => {
		const deps = dependencies({
			fetchPublishedCms: vi.fn().mockRejectedValue(new Error("upstream details must not log")),
		});

		await expect(resolveSiteSettings("shadow", deps)).resolves.toBe(legacyResult);
		expect(deps.log).toHaveBeenCalledWith(
			expect.objectContaining({
				event: "cms.shadow_unavailable",
				code: "convex_query_failed",
			}),
		);
		expect(JSON.stringify(deps.log.mock.calls)).not.toContain("upstream details");
	});

	it("uses only published CMS text while retaining out-of-slice legacy fields", async () => {
		const deps = dependencies();

		await expect(resolveSiteSettings("convex", deps)).resolves.toEqual({
			site: {
				artistName: "CMS name",
				siteTitle: "CMS title",
				tagline: "CMS published tagline",
				socialLinks: [{ platform: "bluesky", url: "https://example.com/cms" }],
				seo: {
					description: "CMS SEO",
					ogImage: "https://cdn.sanity.io/legacy-og.jpg",
				},
			},
			contact: legacyResult.contact,
		});
		expect(deps.log).toHaveBeenCalledWith(
			expect.objectContaining({
				event: "cms.public_read_succeeded",
				provider: "convex",
				revisionId: "revision-123",
			}),
		);
	});

	it("fails closed when convex mode has no published revision", async () => {
		const deps = dependencies({ fetchPublishedCms: vi.fn().mockResolvedValue(null) });

		await expect(resolveSiteSettings("convex", deps)).rejects.toThrow(
			"Published CMS site settings are unavailable",
		);
		expect(deps.log).toHaveBeenCalledWith(
			expect.objectContaining({
				event: "cms.public_read_failed",
				code: "published_revision_missing",
			}),
		);
	});
});
