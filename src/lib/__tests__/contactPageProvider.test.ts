import { describe, expect, it, vi } from "vitest";
import {
	type PublishedContactPageState,
	parseContactPageProviderMode,
	resolveContactPageSettings,
} from "$lib/server/content/contactPageProvider";
import type { SiteSettingsResult } from "$lib/server/content/siteSettings";

const legacy: SiteSettingsResult = {
	site: {
		artistName: "Maggie",
		siteTitle: "Reflecting Pool",
		tagline: "Legacy tagline",
		socialLinks: [],
		seo: { description: "Legacy SEO" },
	},
	contact: {
		heading: "Legacy heading",
		intro: "Legacy intro",
		email: "legacy@example.com",
		confirmationMessage: "Legacy confirmation",
		inquiryChoices: ["Portrait", "Print"],
		booking: {
			enabled: false,
			label: "Legacy booking label",
			intro: "Legacy booking intro",
			calConfig: '{"layout":"month_view"}',
		},
	},
};

const published: PublishedContactPageState = {
	revisionId: "revision-123",
	publishedAt: 100,
	payload: {
		heading: "CMS heading",
		intro: "CMS intro",
		email: "cms@example.com",
		phone: "312-555-0100",
		availability: "Autumn sessions available",
		responseTime: "Within two business days",
		confirmationMessage: "CMS confirmation",
		inquiryChoices: ["Editorial", "Print"],
		booking: {
			enabled: true,
			url: "https://cal.com/maggie/session?month=2026-08",
			label: "Choose a time",
			intro: "Book directly or send a note.",
		},
	},
};

function dependencies(overrides: Record<string, unknown> = {}) {
	return {
		fetchPublishedCms: vi.fn().mockResolvedValue(published),
		log: vi.fn(),
		now: () => 100,
		siteUrl: "zippymiggy.com",
		...overrides,
	};
}

describe("Contact page provider", () => {
	it("defaults unset and unsupported modes to fallback", () => {
		expect(parseContactPageProviderMode(undefined)).toEqual({ mode: "fallback", invalid: false });
		expect(parseContactPageProviderMode("unsupported")).toEqual({
			mode: "fallback",
			invalid: true,
		});
	});

	it("returns legacy content without querying Convex in fallback mode", async () => {
		const deps = dependencies();
		await expect(resolveContactPageSettings("fallback", legacy, deps)).resolves.toBe(legacy);
		expect(deps.fetchPublishedCms).not.toHaveBeenCalled();
	});

	it("returns legacy content and content-free mismatch telemetry in shadow mode", async () => {
		const deps = dependencies();
		await expect(resolveContactPageSettings("shadow", legacy, deps)).resolves.toBe(legacy);
		expect(deps.log).toHaveBeenCalledWith(
			expect.objectContaining({
				event: "cms.shadow_mismatch",
				revisionId: "revision-123",
			}),
		);
		expect(JSON.stringify(deps.log.mock.calls)).not.toContain("CMS heading");
	});

	it("compares named Contact fields rather than object key order", async () => {
		const deps = dependencies({
			fetchPublishedCms: vi.fn().mockResolvedValue({
				revisionId: "revision-same",
				publishedAt: 100,
				payload: {
					inquiryChoices: [...legacy.contact.inquiryChoices],
					heading: legacy.contact.heading,
					confirmationMessage: legacy.contact.confirmationMessage,
					email: legacy.contact.email,
					intro: legacy.contact.intro,
					booking: {
						enabled: false,
						label: legacy.contact.booking.label,
						intro: legacy.contact.booking.intro,
					},
				},
			}),
		});
		await resolveContactPageSettings("shadow", legacy, deps);
		expect(deps.log).toHaveBeenCalledWith(
			expect.objectContaining({
				event: "cms.shadow_match",
				revisionId: "revision-same",
			}),
		);
	});

	it("replaces only Contact content and suppresses a disabled retained URL", async () => {
		const deps = dependencies({
			fetchPublishedCms: vi.fn().mockResolvedValue({
				...published,
				payload: {
					...published.payload,
					booking: { ...published.payload.booking, enabled: false },
				},
			}),
		});
		const result = await resolveContactPageSettings("convex", legacy, deps);
		expect(result.site).toBe(legacy.site);
		expect(result.contact).toMatchObject({
			heading: "CMS heading",
			confirmationMessage: "CMS confirmation",
			inquiryChoices: ["Editorial", "Print"],
			booking: { enabled: false, url: undefined, calConfig: '{"layout":"month_view"}' },
		});
	});

	it("normalizes a Cal booking destination without changing host embed configuration", async () => {
		const result = await resolveContactPageSettings("convex", legacy, dependencies());
		expect(result.contact.booking).toEqual({
			enabled: true,
			url: "https://cal.com/maggie/session?month=2026-08",
			label: "Choose a time",
			intro: "Book directly or send a note.",
			calLink: "maggie/session",
			calConfig: '{"layout":"month_view"}',
		});
	});

	it("fails closed in Convex mode and preserves fallback in shadow mode", async () => {
		const unavailable = dependencies({
			fetchPublishedCms: vi.fn().mockRejectedValue(new Error("secret")),
		});
		await expect(resolveContactPageSettings("shadow", legacy, unavailable)).resolves.toBe(legacy);
		await expect(resolveContactPageSettings("convex", legacy, unavailable)).rejects.toThrow(
			"Published CMS Contact page is unavailable",
		);
		expect(JSON.stringify(unavailable.log.mock.calls)).not.toContain("secret");
	});
});
