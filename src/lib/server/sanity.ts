// Sanity client — server-only, CMS-only.
//
// Scope (audit H42a): this module handles only gallery/print CMS reads.
// Orders do NOT live in Sanity — the Stripe + LumaPrints webhooks write
// to Convex via `@jessepomeroy/crm-api` (see
// `src/routes/api/webhooks/stripe/+server.ts`). See CLAUDE.md §"Key
// architectural facts" #1 for the split.
//
// TODO (H42a): Replace mock print/shop data with real Sanity queries once
// Maggie's print catalog is fully represented in Studio.

import { fetchSanityOrFallback, hasSanityConfig, sanityClient } from "$lib/server/sanityClient";
import type { PrintCollection, PrintProduct } from "$lib/shop/types";
import { V2_SIZES } from "$lib/shop/v2Catalog";

export { type AboutContent, fetchAboutContent } from "$lib/server/content/about";
export { fetchHomepageContent, type HomepageContent } from "$lib/server/content/homepage";
export { fetchSanityOrFallback, hasSanityConfig, sanityClient };

// ─── GROQ Queries ───────────────────────────────────────────

export interface ModelingImage {
	id: string;
	src: string;
	alt: string;
}

export interface ModelingGallery {
	title: string;
	slug: string;
	description?: string;
	images: ModelingImage[];
}

export interface ModelingPageContent {
	eyebrow: string;
	heading: string;
	intro?: string;
	galleries: ModelingGallery[];
	seo: {
		description: string;
		ogImage?: string;
	};
}

const MODELING_PAGE_QUERY = `
*[_type == "modelingPage"][0] {
  eyebrow,
  heading,
  intro,
  galleries[isVisible != false] {
    title,
    "slug": slug.current,
    description,
    images[] {
      "id": _key,
      "src": asset->url,
      alt
    }
  },
  "seo": {
    "description": seo.description,
    "ogImage": seo.ogImage.asset->url
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

export async function fetchModelingPageContent(): Promise<ModelingPageContent> {
	const content = await fetchSanityOrFallback<Partial<ModelingPageContent>>(
		MODELING_PAGE_QUERY,
		getFallbackModelingPageContent(),
	);

	const fallback = getFallbackModelingPageContent();
	const galleries = normalizeModelingGalleries(content.galleries);

	return {
		eyebrow: content.eyebrow || fallback.eyebrow,
		heading: content.heading || fallback.heading,
		intro: content.intro || fallback.intro,
		galleries: galleries.length ? galleries : fallback.galleries,
		seo: {
			description: content.seo?.description || fallback.seo.description,
			ogImage: content.seo?.ogImage || fallback.seo.ogImage,
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

function getFallbackModelingPageContent(): ModelingPageContent {
	return {
		eyebrow: "modeling & acting",
		heading: "digital headshots",
		intro: "placeholder selects for maggie's modeling, acting, and portrait work.",
		galleries: [
			{
				title: "Fashion Editorial",
				slug: "fashion-editorial",
				images: [
					{
						id: "fashion-01",
						src: "/images/flower-01.jpg",
						alt: "placeholder editorial headshot one",
					},
					{
						id: "fashion-02",
						src: "/images/flower-02.jpg",
						alt: "placeholder editorial headshot two",
					},
					{
						id: "fashion-03",
						src: "/images/flower-03.jpg",
						alt: "placeholder editorial headshot three",
					},
					{
						id: "fashion-04",
						src: "/images/flower-04.jpg",
						alt: "placeholder editorial headshot four",
					},
					{
						id: "fashion-05",
						src: "/images/flower-05.jpg",
						alt: "placeholder editorial headshot five",
					},
					{
						id: "fashion-06",
						src: "/images/flower-06.jpg",
						alt: "placeholder editorial headshot six",
					},
				],
			},
			{
				title: "Comp Card Digitals",
				slug: "comp-card-digitals",
				images: [
					{
						id: "digitals-01",
						src: "/images/flower-07.jpg",
						alt: "placeholder comp card digital one",
					},
					{
						id: "digitals-02",
						src: "/images/flower-08.jpg",
						alt: "placeholder comp card digital two",
					},
					{
						id: "digitals-03",
						src: "/images/flower-09.jpg",
						alt: "placeholder comp card digital three",
					},
					{
						id: "digitals-04",
						src: "/images/flower-10.jpg",
						alt: "placeholder comp card digital four",
					},
					{
						id: "digitals-05",
						src: "/images/flower-11.jpg",
						alt: "placeholder comp card digital five",
					},
					{
						id: "digitals-06",
						src: "/images/flower-13.jpg",
						alt: "placeholder comp card digital six",
					},
				],
			},
			{
				title: "Commercial",
				slug: "commercial",
				images: [
					{
						id: "commercial-01",
						src: "/images/flower-14.jpg",
						alt: "placeholder commercial headshot one",
					},
					{
						id: "commercial-02",
						src: "/images/flower-15.jpg",
						alt: "placeholder commercial headshot two",
					},
					{
						id: "commercial-03",
						src: "/images/flower-16.jpg",
						alt: "placeholder commercial headshot three",
					},
					{
						id: "commercial-04",
						src: "/images/flower-17.jpg",
						alt: "placeholder commercial headshot four",
					},
					{
						id: "commercial-05",
						src: "/images/flower-18.jpg",
						alt: "placeholder commercial headshot five",
					},
					{
						id: "commercial-06",
						src: "/images/flower-19.jpg",
						alt: "placeholder commercial headshot six",
					},
				],
			},
		],
		seo: {
			description: "Digital headshots and modeling portfolio for Margaret Helena.",
		},
	};
}

function normalizeModelingGalleries(galleries?: Partial<ModelingGallery>[]) {
	return (
		galleries
			?.map((gallery) => ({
				title: gallery.title ?? "",
				slug: gallery.slug ?? "",
				description: gallery.description,
				images:
					gallery.images
						?.map((image) => ({
							id: image.id ?? image.src ?? "",
							src: image.src ?? "",
							alt: image.alt ?? gallery.title ?? "modeling portfolio image",
						}))
						.filter((image) => image.id && image.src) ?? [],
			}))
			.filter((gallery) => gallery.title && gallery.slug && gallery.images.length) ?? []
	);
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
