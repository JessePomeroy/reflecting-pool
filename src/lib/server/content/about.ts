import { fetchSanityOrFallback } from "$lib/server/sanityClient";

export interface AboutContent {
	heading: string;
	displayName: string;
	role?: string;
	introduction: string;
	biography: string;
	portraits: AboutPortraitContent[];
	sections: { title: string; items: string[] }[];
	highlights: { label: string; value: string }[];
	socialLinks: { platform: string; url: string }[];
	seo: {
		description: string;
		ogImage: string;
	};
}

export interface AboutPortraitContent {
	key: string;
	src: string;
	srcset?: string;
	width?: number;
	height?: number;
	altText: string;
	decorative: boolean;
	focalPoint: { x: number; y: number };
}

export interface AboutSanityResult {
	about?: {
		heading?: string;
		name?: string;
		title?: string;
		portrait?: string;
		shortBio?: string;
		plainBio?: string;
		sections?: { title?: string; items?: string[] }[];
		highlights?: { label?: string; value?: string }[];
		social?: { instagram?: string; twitter?: string; email?: string };
		seo?: { description?: string; ogImage?: string };
	};
	settings?: { socialLinks?: { platform?: string; url?: string }[] };
}

const ABOUT_QUERY = `
{
  "about": *[_type == "about"][0] {
    heading,
    name,
    title,
    "portrait": portrait.asset->url,
    shortBio,
    plainBio,
    sections[] {
      title,
      items
    },
    highlights[] {
      label,
      value
    },
    social {
      instagram,
      twitter,
      email
    },
    "seo": {
      "description": seo.description,
      "ogImage": seo.ogImage.asset->url
    }
  },
  "settings": *[_type == "siteSettings"][0] {
    socialLinks[] {
      platform,
      url
    }
  }
}
`;

export async function fetchLegacyAboutContent(): Promise<AboutContent> {
	const result = await fetchSanityOrFallback<AboutSanityResult>(ABOUT_QUERY, {});
	return normalizeAboutContent(result);
}

export function normalizeAboutContent(result: AboutSanityResult): AboutContent {
	const fallback = getFallbackAboutContent();
	const about = result.about;
	const socialLinks = result.settings?.socialLinks?.filter(isCompleteLink) ?? [];
	const legacySocialLinks = [
		about?.social?.instagram ? { platform: "instagram", url: about.social.instagram } : null,
		about?.social?.twitter ? { platform: "twitter", url: about.social.twitter } : null,
		about?.social?.email ? { platform: "email", url: `mailto:${about.social.email}` } : null,
	].filter(isCompleteLink);

	return {
		heading: about?.heading || fallback.heading,
		displayName: about?.name || fallback.displayName,
		role: about?.title || fallback.role,
		introduction: about?.shortBio || fallback.introduction,
		biography: about?.plainBio || fallback.biography,
		portraits: about?.portrait
			? [
					{
						key: "sanity-portrait",
						src: about.portrait,
						altText: about.name || fallback.displayName,
						decorative: false,
						focalPoint: { x: 0.5, y: 0.5 },
					},
				]
			: fallback.portraits,
		sections: normalizeSections(about?.sections) ?? fallback.sections,
		highlights: normalizeHighlights(about?.highlights) ?? fallback.highlights,
		socialLinks: socialLinks.length
			? socialLinks
			: legacySocialLinks.length
				? legacySocialLinks
				: fallback.socialLinks,
		seo: {
			description: about?.seo?.description || fallback.seo.description,
			ogImage: about?.seo?.ogImage || fallback.seo.ogImage,
		},
	};
}

export function getFallbackAboutContent(): AboutContent {
	return {
		heading: "about",
		displayName: "margaret helena / maggie mac / zippymiggy",
		introduction: "",
		biography: "",
		portraits: [
			{
				key: "fallback-portrait",
				src: "/images/flower-01.jpg",
				altText: "",
				decorative: true,
				focalPoint: { x: 0.5, y: 0.5 },
			},
		],
		sections: [
			{
				title: "background",
				items: [
					"Chicago-raised creative working across documentation, direction, music, and performance",
					"BA in Journalism + minor in Media Art, University of Wisconsin-Whitewater",
					"Former volleyball setter — a role that continues to shape how I approach collaboration, timing, and visual awareness",
				],
			},
			{
				title: "experience",
				items: [
					"Off the Record Press — concert photography",
					"Steven Piper — commercial photography internship",
					"Maggie Mac LLC — freelance photography and videography",
					"SGK Inc. + Chicago-based photographers — freelance photo/production assistant",
					"Heaven Gallery (Wicker Park) — gallery intern",
				],
			},
			{
				title: "practice",
				items: ["Photography, direction, and music", "Modeling, acting, and singing"],
			},
			{
				title: "current",
				items: [
					"Building In Between — a space for artists to gather where image, sound, and memory meet",
				],
			},
		],
		highlights: [
			{ label: "based in", value: "chicago, illinois" },
			{ label: "practice", value: "photography · direction · music" },
			{ label: "performance", value: "modeling · acting · singing" },
			{ label: "available for", value: "photo · video · production support" },
		],
		socialLinks: [{ platform: "instagram", url: "https://www.instagram.com/zippymiggy/" }],
		seo: {
			description:
				"margaret helena — chicago-raised creative working across photography, direction, music, modeling, acting, and performance.",
			ogImage: "/images/flower-03.jpg",
		},
	};
}

function isCompleteLink(
	link: { platform?: string; url?: string } | null | undefined,
): link is { platform: string; url: string } {
	return Boolean(link?.platform && link.url);
}

function normalizeSections(sections?: { title?: string; items?: string[] }[]) {
	const normalized = sections
		?.map((section) => ({
			title: section.title ?? "",
			items: section.items?.filter(Boolean) ?? [],
		}))
		.filter((section) => section.title && section.items.length);

	return normalized?.length ? normalized : null;
}

function normalizeHighlights(highlights?: { label?: string; value?: string }[]) {
	const normalized = highlights
		?.map((highlight) => ({
			label: highlight.label ?? "",
			value: highlight.value ?? "",
		}))
		.filter((highlight) => highlight.label && highlight.value);

	return normalized?.length ? normalized : null;
}
