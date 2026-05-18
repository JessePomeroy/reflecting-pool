import { describe, expect, it } from "vitest";
import { getFallbackSiteSettings, normalizeSiteSettings } from "$lib/server/content/siteSettings";

describe("normalizeSiteSettings", () => {
	it("uses fallback content when Sanity settings are missing", () => {
		expect(normalizeSiteSettings({})).toEqual(getFallbackSiteSettings());
	});

	it("preserves site settings and filters incomplete social links", () => {
		const result = normalizeSiteSettings({
			site: {
				artistName: "Maggie",
				siteTitle: "Maggie Site",
				tagline: "custom",
				socialLinks: [
					{ platform: "instagram", url: "https://www.instagram.com/zippymiggy/" },
					{ platform: "", url: "https://example.com/drop-me" },
				],
				seo: {
					description: "Custom SEO",
					ogImage: "https://cdn.sanity.io/og.jpg",
				},
			},
		});

		expect(result.site).toEqual({
			artistName: "Maggie",
			siteTitle: "Maggie Site",
			tagline: "custom",
			socialLinks: [{ platform: "instagram", url: "https://www.instagram.com/zippymiggy/" }],
			seo: {
				description: "Custom SEO",
				ogImage: "https://cdn.sanity.io/og.jpg",
			},
		});
	});

	it("only enables booking when Sanity enables it and provides a URL", () => {
		expect(
			normalizeSiteSettings({
				contact: {
					bookingEnabled: true,
				},
			}).contact.booking.enabled,
		).toBe(false);

		const result = normalizeSiteSettings({
			contact: {
				bookingEnabled: true,
				bookingUrl: "https://cal.com/maggie/session",
			},
		});

		expect(result.contact.booking.enabled).toBe(true);
		expect(result.contact.booking.url).toBe("https://cal.com/maggie/session");
		expect(result.contact.booking.calLink).toBe("maggie/session");
	});

	it("keeps non-Cal booking URLs available as external booking links", () => {
		const result = normalizeSiteSettings({
			contact: {
				bookingEnabled: true,
				bookingUrl: "https://example.com/book",
			},
		});

		expect(result.contact.booking.enabled).toBe(true);
		expect(result.contact.booking.url).toBe("https://example.com/book");
		expect(result.contact.booking.calLink).toBeUndefined();
	});
});
