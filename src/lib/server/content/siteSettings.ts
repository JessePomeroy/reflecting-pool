import { fetchSanityOrFallback } from "$lib/server/sanityClient";

export interface SocialLink {
	platform: string;
	url: string;
}

export interface SiteSettingsContent {
	artistName: string;
	siteTitle: string;
	tagline: string;
	socialLinks: SocialLink[];
	seo: {
		description: string;
		ogImage?: string;
	};
}

export interface ContactSettingsContent {
	heading: string;
	intro: string;
	email: string;
	booking: {
		enabled: boolean;
		url?: string;
		label: string;
		intro: string;
		calLink?: string;
		calConfig: string;
	};
}

interface SettingsSanityResult {
	site?: {
		artistName?: string;
		siteTitle?: string;
		tagline?: string;
		socialLinks?: Partial<SocialLink>[];
		seo?: { description?: string; ogImage?: string };
	};
	contact?: {
		heading?: string;
		introText?: string;
		email?: string;
		bookingEnabled?: boolean;
		bookingUrl?: string;
	};
}

export type SiteSettingsResult = {
	site: SiteSettingsContent;
	contact: ContactSettingsContent;
};

const SETTINGS_QUERY = `
{
  "site": *[_type == "siteSettings"][0] {
    artistName,
    siteTitle,
    tagline,
    socialLinks[] {
      platform,
      url
    },
    "seo": {
      "description": seo.description,
      "ogImage": seo.ogImage.asset->url
    }
  },
  "contact": *[_type == "contactPage"][0] {
    heading,
    "introText": pt::text(intro),
    email,
    bookingEnabled,
    bookingUrl
  }
}
`;

export async function fetchSiteSettings(): Promise<SiteSettingsResult> {
	const result = await fetchSanityOrFallback<SettingsSanityResult>(SETTINGS_QUERY, {});
	return normalizeSiteSettings(result);
}

export function normalizeSiteSettings(result: SettingsSanityResult): SiteSettingsResult {
	const fallback = getFallbackSiteSettings();
	const site = result.site;
	const contact = result.contact;
	const bookingUrl = normalizeUrl(contact?.bookingUrl);

	return {
		site: {
			artistName: site?.artistName || fallback.site.artistName,
			siteTitle: site?.siteTitle || fallback.site.siteTitle,
			tagline: site?.tagline || fallback.site.tagline,
			socialLinks: normalizeSocialLinks(site?.socialLinks) ?? fallback.site.socialLinks,
			seo: {
				description: site?.seo?.description || fallback.site.seo.description,
				ogImage: site?.seo?.ogImage || fallback.site.seo.ogImage,
			},
		},
		contact: {
			heading: contact?.heading || fallback.contact.heading,
			intro: contact?.introText || fallback.contact.intro,
			email: contact?.email || fallback.contact.email,
			booking: {
				enabled: Boolean(contact?.bookingEnabled && bookingUrl),
				url: bookingUrl,
				label: fallback.contact.booking.label,
				intro: fallback.contact.booking.intro,
				calLink: bookingUrl ? getCalLink(bookingUrl) : undefined,
				calConfig: fallback.contact.booking.calConfig,
			},
		},
	};
}

export function getFallbackSiteSettings(): SiteSettingsResult {
	return {
		site: {
			artistName: "margaret helena",
			siteTitle: "margaret helena · photography",
			tagline:
				"Fine art photography prints, portfolio galleries, booking, and botanical commissions.",
			socialLinks: [{ platform: "instagram", url: "https://www.instagram.com/zippymiggy/" }],
			seo: {
				description:
					"Margaret Helena photography, portfolio galleries, booking, and fine art prints.",
			},
		},
		contact: {
			heading: "get in touch",
			intro:
				"questions about prints, sessions, or just want to say hello — i'd love to hear from you.",
			email: "hello.margarethelena@gmail.com",
			booking: {
				enabled: false,
				label: "book a session",
				intro:
					"portrait sessions, editorial work, and botanical commissions. let's make something together.",
				calConfig: '{"layout":"month_view"}',
			},
		},
	};
}

function normalizeSocialLinks(links?: Partial<SocialLink>[]) {
	const normalized = links
		?.map((link) => ({
			platform: link.platform ?? "",
			url: link.url ?? "",
		}))
		.filter((link) => link.platform && link.url);

	return normalized?.length ? normalized : null;
}

function normalizeUrl(url?: string) {
	if (!url?.trim()) return undefined;
	return url.trim();
}

function getCalLink(url: string) {
	try {
		const parsed = new URL(url);
		if (!parsed.hostname.endsWith("cal.com")) return undefined;

		const path = parsed.pathname.replace(/^\/+|\/+$/g, "");
		return path || undefined;
	} catch {
		const marker = "cal.com/";
		const index = url.indexOf(marker);
		if (index === -1) return undefined;

		return url
			.slice(index + marker.length)
			.split(/[?#]/)[0]
			?.replace(/^\/+|\/+$/g, "");
	}
}
