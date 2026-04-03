// Sanity client — server-only
// Write token needed for creating orders from webhooks
// TODO: Replace mock data with real Sanity queries once project ID is set

import { createClient } from "@sanity/client";
import { SANITY_API_TOKEN, SANITY_DATASET, SANITY_PROJECT_ID } from "$env/static/private";
import type { Order, PrintCollection, PrintProduct } from "$lib/shop/types";

export const sanityClient = createClient({
	projectId: SANITY_PROJECT_ID,
	dataset: SANITY_DATASET,
	token: SANITY_API_TOKEN,
	apiVersion: "2024-01-01",
	useCdn: false, // We need fresh data for orders
});

// ─── GROQ Queries ───────────────────────────────────────────

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

/**
 * Create an order document in Sanity.
 * Called from Stripe webhook after successful checkout.
 */
export async function createSanityOrder(data: {
	stripeSessionId: string;
	customerName: string;
	customerEmail: string;
	paperName: string;
	paperSize: string;
	amount: number;
	imageUrl: string;
	imageTitle: string;
}): Promise<Order> {
	// TODO: Uncomment when Sanity project is set up:
	// return sanityClient.create({
	//   _type: 'order',
	//   ...data,
	//   status: 'processing',
	//   createdAt: new Date().toISOString(),
	// });

	// Mock: return a fake order for development
	console.log("[Sanity Mock] Creating order:", data);
	return {
		_id: `mock-order-${Date.now()}`,
		stripeSessionId: data.stripeSessionId,
		customerName: data.customerName,
		customerEmail: data.customerEmail,
		status: "processing",
		paperName: data.paperName,
		paperSize: data.paperSize,
		amount: data.amount,
		createdAt: new Date().toISOString(),
	};
}

/**
 * Update an order in Sanity (e.g., with LumaPrints order number or tracking).
 */
export async function updateSanityOrder(orderId: string, data: Partial<Order>): Promise<void> {
	// TODO: Uncomment when Sanity project is set up:
	// await sanityClient.patch(orderId).set(data).commit();

	console.log(`[Sanity Mock] Updating order ${orderId}:`, data);
}

/**
 * Find an order by LumaPrints order number.
 */
export async function findOrderByLumaprintsNumber(orderNumber: string): Promise<Order | null> {
	// TODO: Uncomment when Sanity project is set up:
	// return sanityClient.fetch(
	//   `*[_type == "order" && lumaprintsOrderNumber == $orderNumber][0]`,
	//   { orderNumber }
	// );

	console.log(`[Sanity Mock] Looking up order by LumaPrints #${orderNumber}`);
	return null;
}

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

const DEFAULT_SIZES = [
	{ width: 4, height: 6, label: "4×6" },
	{ width: 8, height: 10, label: "8×10" },
	{ width: 11, height: 14, label: "11×14" },
	{ width: 16, height: 20, label: "16×20" },
];

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
//     availableSizes: AVAILABLE_SIZES,
//   };
// }
