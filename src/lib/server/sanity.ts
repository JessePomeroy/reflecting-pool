// Sanity client — server-only, CMS-only.
//
// Scope (audit H42a): this module handles only gallery/print CMS reads.
// Orders do NOT live in Sanity — the Stripe + LumaPrints webhooks write
// to Convex via `@jessepomeroy/crm-api` (see
// `src/routes/api/webhooks/stripe/+server.ts`). See CLAUDE.md §"Key
// architectural facts" #1 for the split.
//
// TODO (H42a): Replace mock data with real Sanity queries once the
// project is created and the `gallery` schema is deployed.

import { createClient } from "@sanity/client";
import { env } from "$env/dynamic/private";
import { env as publicEnv } from "$env/dynamic/public";
import type { PrintCollection, PrintProduct } from "$lib/shop/types";
import { V2_SIZES } from "$lib/shop/v2Catalog";

// Per-client Sanity tenancy is currently undecided (platform-owned vs
// client-owned, see angelsrest CLAUDE.md). Until a tenant's project is
// provisioned, Vercel won't have these vars set; using $env/dynamic/private
// defers the missing-secret failure from build to request time so the rest
// of the site can deploy. Sanity-backed content routes will 500 until real
// values are pushed.
//
// Lazy-init is required: the @sanity/client constructor throws
// "Configuration must contain `projectId`" if projectId is undefined,
// which would crash SvelteKit's prerender step at build time. By
// constructing on first use, we guarantee the build succeeds even
// when the env is empty.
let _sanityClient: ReturnType<typeof createClient> | null = null;
const sanityProjectId = env.SANITY_PROJECT_ID || publicEnv.PUBLIC_SANITY_PROJECT_ID;
const sanityDataset = env.SANITY_DATASET || publicEnv.PUBLIC_SANITY_DATASET;

export function sanityClient() {
	if (!_sanityClient) {
		_sanityClient = createClient({
			projectId: sanityProjectId,
			dataset: sanityDataset,
			token: env.SANITY_API_READ_TOKEN || undefined,
			apiVersion: "2024-01-01",
			// CDN on — gallery reads are public and tolerate the short stale window.
			useCdn: true,
		});
	}
	return _sanityClient;
}

function hasSanityConfig() {
	return Boolean(sanityProjectId && sanityDataset);
}

async function fetchOrFallback<T>(query: string, fallback: T, params?: Record<string, unknown>) {
	if (!hasSanityConfig()) return fallback;

	try {
		const result = await sanityClient().fetch<T | null>(query, params ?? {});
		return result ?? fallback;
	} catch (err) {
		console.error("[sanity] Falling back after fetch failed:", err);
		return fallback;
	}
}

// ─── GROQ Queries ───────────────────────────────────────────

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

export interface AboutContent {
	heading: string;
	portrait: string;
	bio: string;
	artistStatement: string;
	sections: { title: string; items: string[] }[];
	highlights: { label: string; value: string }[];
	socialLinks: { platform: string; url: string }[];
	seo: {
		description: string;
		ogImage: string;
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

const _PRINTABLE_IMAGES_QUERY = `
*[_type == "gallery" && isVisible == true] {
  _id,
  title,
  "slug": slug.current,
  images[printAvailable == true] {
    "id": _key,
    image { asset-> { url, metadata { dimensions, lqip } } },
    caption,
    alt,
    printAvailable
  }
}[count(images) > 0]
`;

const _SINGLE_PRINT_QUERY = `
*[_type == "gallery" && isVisible == true] {
  title,
  "gallerySlug": slug.current,
  images[printAvailable == true && _key == $imageId][0] {
    "id": _key,
    image { asset-> { url, metadata { dimensions, lqip } } },
    caption,
    alt
  }
}[defined(images)][0]
`;

const _COLLECTIONS_QUERY = `
*[_type == "gallery" && isVisible == true] | order(sortOrder asc) {
  _id,
  title,
  "slug": slug.current,
  description,
  coverImage { asset-> { url } },
  "printCount": count(images[printAvailable == true])
}[printCount > 0]
`;

const _COLLECTION_WITH_PRINTS_QUERY = `
*[_type == "gallery" && slug.current == $slug && isVisible == true][0] {
  _id,
  title,
  "slug": slug.current,
  description,
  coverImage { asset-> { url } },
  images[printAvailable == true] {
    "id": _key,
    image { asset-> { url, metadata { dimensions, lqip } } },
    caption,
    alt
  }
}
`;

// ─── Data Fetchers ──────────────────────────────────────────

export async function fetchHomepageContent(): Promise<HomepageContent> {
	const content = await fetchOrFallback<Partial<HomepageContent>>(
		HOMEPAGE_QUERY,
		getFallbackHomepageContent(),
	);

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

export async function fetchAboutContent(): Promise<AboutContent> {
	const result = await fetchOrFallback<{
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
	}>(ABOUT_QUERY, {});

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
		portrait: about?.portrait || fallback.portrait,
		bio:
			about?.plainBio ||
			[about?.name, about?.shortBio].filter(Boolean).join("\n\n") ||
			fallback.bio,
		artistStatement: fallback.artistStatement,
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

/**
 * Fetch all printable images across all galleries.
 * TODO: Replace mock data with real Sanity query when project ID is configured.
 */
export async function fetchPrintableProducts(): Promise<PrintProduct[]> {
	// TODO: Uncomment when Sanity project is set up:
	// const galleries = await sanityClient.fetch(PRINTABLE_IMAGES_QUERY);
	// return galleries.flatMap(mapGalleryToProducts);

	// Mock data matching the schema for development
	return getMockProducts();
}

/**
 * Fetch a single printable image by its slug (gallery-slug--image-key).
 * TODO: Replace mock data with real Sanity query when project ID is configured.
 */
/**
 * Fetch all print collections.
 * TODO: Replace mock data with real Sanity query when project ID is configured.
 */
export async function fetchCollections(): Promise<PrintCollection[]> {
	// TODO: Uncomment when Sanity project is set up:
	// return sanityClient.fetch(COLLECTIONS_QUERY);

	return getMockCollections();
}

/**
 * Fetch a single collection with its prints by slug.
 * TODO: Replace mock data with real Sanity query when project ID is configured.
 */
export async function fetchCollectionWithPrints(
	slug: string,
): Promise<{ collection: PrintCollection; prints: PrintProduct[] } | null> {
	// TODO: Uncomment when Sanity project is set up:
	// const result = await sanityClient.fetch(COLLECTION_WITH_PRINTS_QUERY, { slug });
	// if (!result) return null;
	// return { collection: result, prints: result.images.map(...) };

	const collections = getMockCollections();
	const collection = collections.find((c) => c.slug === slug);
	if (!collection) return null;

	const allProducts = getMockProducts();
	const prints = allProducts.filter((p) => p.gallerySlug === slug);
	return { collection, prints };
}

/**
 * Fetch a single printable image by its slug (gallery-slug--image-key).
 * TODO: Replace mock data with real Sanity query when project ID is configured.
 */
export async function fetchPrintProduct(slug: string): Promise<PrintProduct | null> {
	// TODO: Uncomment when Sanity project is set up:
	// const [gallerySlug, imageId] = slug.split('--');
	// const result = await sanityClient.fetch(SINGLE_PRINT_QUERY, { imageId });
	// if (!result?.images) return null;
	// return mapImageToProduct(result.images, result.title, result.gallerySlug);

	const products = getMockProducts();
	return products.find((p) => p.slug === slug) ?? null;
}

// Order-related functions (`createSanityOrder`, `updateSanityOrder`,
// `findOrderByLumaprintsNumber`, `findOrderByStripeSessionId`) used to
// live here. They were removed on the H42b Sanity → Convex migration
// (2026-04-23). Orders now live in Convex; the webhook handlers call
// `api.orders.create` / `api.orders.updateStatus` /
// `api.orders.getByLumaprintsOrderNumber` via `@jessepomeroy/crm-api`.

// ─── Mock Data ──────────────────────────────────────────────

function getMockCollections(): PrintCollection[] {
	return [
		{
			id: "col-wildflowers",
			title: "Wildflowers",
			slug: "wildflowers",
			description:
				"Untamed blooms caught in their natural habitat — meadow edges, roadsides, and forgotten fields.",
			coverImage: "/images/flower-03.jpg",
			printCount: 7,
		},
		{
			id: "col-garden-portraits",
			title: "Garden Portraits",
			slug: "garden-portraits",
			description:
				"Cultivated beauty — roses, peonies, and heirloom varieties posed in their prime.",
			coverImage: "/images/flower-10.jpg",
			printCount: 7,
		},
		{
			id: "col-close-ups",
			title: "Close-ups",
			slug: "close-ups",
			description:
				"Intimate details — petal textures, pollen grains, and the geometry hidden inside every bloom.",
			coverImage: "/images/flower-17.jpg",
			printCount: 7,
		},
		{
			id: "col-moody-blooms",
			title: "Moody Blooms",
			slug: "moody-blooms",
			description: "Dark tones, dramatic light — florals that feel like old paintings.",
			coverImage: "/images/flower-24.jpg",
			printCount: 5,
		},
		{
			id: "col-panoramic",
			title: "Panoramic",
			slug: "panoramic",
			description: "Wide views of fields, gardens, and floral landscapes — scale and atmosphere.",
			coverImage: "/images/flower-30.jpg",
			printCount: 8,
		},
	];
}

function getFallbackHomepageContent(): HomepageContent {
	return {
		practiceLine:
			"Exploring light, movement, and sound as a photographer, director, model, and musician.",
		quote: {
			text: "The camera does not know what it takes; it captures materials with which you reconstruct, not so much what you saw as what you thought you saw. Hence the best photography is aware, mindful, of illusion and uses illusion, permitting and encouraging it - especially unconscious and powerful illusions that are not usually admitted on the scene.",
			attribution: "Thomas Merton",
		},
		navLinks: [
			{ label: "about", href: "/about" },
			{ label: "modeling & acting", href: "/about#modeling-acting" },
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

function getFallbackAboutContent(): AboutContent {
	return {
		heading: "about",
		portrait: "/images/flower-01.jpg",
		bio: "",
		artistStatement:
			"Building In Between — a space for artists to gather where image, sound, and memory meet.",
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
		socialLinks: [{ platform: "instagram", url: "https://instagram.com/margarethelena" }],
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

const DEFAULT_SIZES = V2_SIZES.map((s) => ({ width: s.width, height: s.height, label: s.label }));

function makeMockPrint(
	num: string,
	title: string,
	galleryTitle: string,
	gallerySlug: string,
): PrintProduct {
	return {
		id: `img-${num}`,
		title,
		slug: `${gallerySlug}--img-${num}`,
		caption: title,
		alt: `${title} — ${galleryTitle}`,
		imageUrl: `/images/flower-${num}.jpg`,
		lqip: undefined,
		galleryTitle,
		gallerySlug,
		availableSizes: DEFAULT_SIZES,
	};
}

function getMockProducts(): PrintProduct[] {
	return [
		// Wildflowers (01–07)
		makeMockPrint("01", "Spring Meadow", "Wildflowers", "wildflowers"),
		makeMockPrint("02", "Roadside Daisies", "Wildflowers", "wildflowers"),
		makeMockPrint("03", "Prairie Fire", "Wildflowers", "wildflowers"),
		makeMockPrint("04", "Clover Patch", "Wildflowers", "wildflowers"),
		makeMockPrint("05", "Violet Hour", "Wildflowers", "wildflowers"),
		makeMockPrint("06", "Goldenrod", "Wildflowers", "wildflowers"),
		makeMockPrint("07", "Wild Aster", "Wildflowers", "wildflowers"),
		// Garden Portraits (08–14)
		makeMockPrint("08", "Peony Blush", "Garden Portraits", "garden-portraits"),
		makeMockPrint("09", "Rose Study", "Garden Portraits", "garden-portraits"),
		makeMockPrint("10", "Dahlia Crown", "Garden Portraits", "garden-portraits"),
		makeMockPrint("11", "Hydrangea Blue", "Garden Portraits", "garden-portraits"),
		makeMockPrint("12", "Iris at Dawn", "Garden Portraits", "garden-portraits"),
		makeMockPrint("13", "Tulip Flame", "Garden Portraits", "garden-portraits"),
		makeMockPrint("14", "Lily of the Valley", "Garden Portraits", "garden-portraits"),
		// Close-ups (15–21)
		makeMockPrint("15", "Petal Grain", "Close-ups", "close-ups"),
		makeMockPrint("16", "Stamen Detail", "Close-ups", "close-ups"),
		makeMockPrint("17", "Dew on Silk", "Close-ups", "close-ups"),
		makeMockPrint("18", "Pollen Dust", "Close-ups", "close-ups"),
		makeMockPrint("19", "Unfurling", "Close-ups", "close-ups"),
		makeMockPrint("20", "Translucent Petal", "Close-ups", "close-ups"),
		makeMockPrint("21", "Inner Light", "Close-ups", "close-ups"),
		// Moody Blooms (22, 24–27 — no 23)
		makeMockPrint("22", "Shadow Rose", "Moody Blooms", "moody-blooms"),
		makeMockPrint("24", "Bruised Petals", "Moody Blooms", "moody-blooms"),
		makeMockPrint("25", "Fade to Black", "Moody Blooms", "moody-blooms"),
		makeMockPrint("26", "Wilting Grace", "Moody Blooms", "moody-blooms"),
		makeMockPrint("27", "Last Light", "Moody Blooms", "moody-blooms"),
		// Panoramic (28–35)
		makeMockPrint("28", "Lavender Fields", "Panoramic", "panoramic"),
		makeMockPrint("29", "Sunflower Row", "Panoramic", "panoramic"),
		makeMockPrint("30", "Garden Path", "Panoramic", "panoramic"),
		makeMockPrint("31", "Hillside Bloom", "Panoramic", "panoramic"),
		makeMockPrint("32", "Morning Mist", "Panoramic", "panoramic"),
		makeMockPrint("33", "Flower Market", "Panoramic", "panoramic"),
		makeMockPrint("34", "Golden Hour Field", "Panoramic", "panoramic"),
		makeMockPrint("35", "Distant Blooms", "Panoramic", "panoramic"),
	];
}

// ─── Helpers ────────────────────────────────────────────────
// These will map raw Sanity responses to our PrintProduct type
// TODO: Uncomment and use when Sanity is connected

// function mapGalleryToProducts(gallery: any): PrintProduct[] {
//   return gallery.images.map((img: any) =>
//     mapImageToProduct(img, gallery.title, gallery.slug)
//   );
// }

// function mapImageToProduct(img: any, galleryTitle: string, gallerySlug: string): PrintProduct {
//   return {
//     id: img.id,
//     title: img.caption || img.alt,
//     slug: `${gallerySlug}--${img.id}`,
//     caption: img.caption,
//     alt: img.alt,
//     imageUrl: img.image.asset.url,
//     lqip: img.image.asset.metadata?.lqip,
//     galleryTitle,
//     gallerySlug,
//     availableSizes: V2_SIZES.map(s => ({ width: s.width, height: s.height, label: s.label })),
//   };
// }
