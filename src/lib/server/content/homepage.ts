import { homepageQuoteSeed } from "$lib/content/homepageQuoteSeed";
import { fetchSanityOrFallback } from "$lib/server/sanityClient";

export interface HomepageContent {
	practiceLine: string;
	quote: {
		text: string;
		attribution: string;
	};
	navLinks: { label: string; href: string }[];
	seo: {
		description: string;
		ogImage?: string;
	};
}

const HOMEPAGE_QUERY = `
*[_type == "homepage"][0] {
  practiceLine,
  quote {
    text,
    attribution
  },
  navLinks[] {
    label,
    href
  },
  "seo": {
    "description": seo.description,
    "ogImage": seo.ogImage.asset->url
  }
}
`;

export async function fetchHomepageContent(): Promise<HomepageContent> {
	const content = await fetchSanityOrFallback<Partial<HomepageContent>>(
		HOMEPAGE_QUERY,
		getFallbackHomepageContent(),
	);

	return normalizeHomepageContent(content);
}

export function normalizeHomepageContent(content: Partial<HomepageContent>): HomepageContent {
	const fallback = getFallbackHomepageContent();
	return {
		practiceLine: content.practiceLine || fallback.practiceLine,
		quote: {
			text: content.quote?.text || fallback.quote.text,
			attribution: content.quote?.attribution || fallback.quote.attribution,
		},
		navLinks: content.navLinks?.length ? content.navLinks : fallback.navLinks,
		seo: {
			description: content.seo?.description || fallback.seo.description,
			ogImage: content.seo?.ogImage || fallback.seo.ogImage,
		},
	};
}

export function getFallbackHomepageContent(): HomepageContent {
	return {
		practiceLine:
			"Exploring light, movement, and sound as a photographer, director, model, and musician.",
		quote: {
			...homepageQuoteSeed,
		},
		navLinks: [
			{ label: "about", href: "/about" },
			{ label: "modeling & acting", href: "/modeling" },
			{ label: "photography", href: "/gallery" },
			{ label: "booking", href: "/about#book" },
			{ label: "shop prints", href: "/shop" },
		],
		seo: {
			description:
				"Margaret Helena photography, portfolio galleries, booking, and fine art prints.",
		},
	};
}
