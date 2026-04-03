// Sanity client — server-only
// Write token needed for creating orders from webhooks
// TODO: Replace mock data with real Sanity queries once project ID is set

import { createClient } from "@sanity/client";
import { SANITY_API_TOKEN, SANITY_DATASET, SANITY_PROJECT_ID } from "$env/static/private";
import type { Order, PrintProduct } from "$lib/shop/types";

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

function getMockProducts(): PrintProduct[] {
	return [
		{
			id: "img-001",
			title: "Morning Light on the Lake",
			slug: "landscapes--img-001",
			caption: "Golden hour reflections over still water",
			alt: "Lake at sunrise with golden reflections",
			imageUrl: "https://cdn.sanity.io/images/example/production/lake-morning.jpg",
			lqip: undefined,
			galleryTitle: "Landscapes",
			gallerySlug: "landscapes",
			availableSizes: [
				{ width: 4, height: 6, label: "4×6" },
				{ width: 8, height: 10, label: "8×10" },
				{ width: 11, height: 14, label: "11×14" },
				{ width: 16, height: 20, label: "16×20" },
			],
		},
		{
			id: "img-002",
			title: "Wildflower Meadow",
			slug: "wildflowers--img-002",
			caption: "A field of wildflowers in late summer",
			alt: "Purple and yellow wildflowers stretching to the horizon",
			imageUrl: "https://cdn.sanity.io/images/example/production/wildflower-meadow.jpg",
			lqip: undefined,
			galleryTitle: "Wildflowers",
			gallerySlug: "wildflowers",
			availableSizes: [
				{ width: 4, height: 6, label: "4×6" },
				{ width: 8, height: 10, label: "8×10" },
				{ width: 11, height: 14, label: "11×14" },
				{ width: 16, height: 20, label: "16×20" },
			],
		},
		{
			id: "img-003",
			title: "Forest Cathedral",
			slug: "landscapes--img-003",
			caption: "Sunlight streaming through ancient trees",
			alt: "Tall trees with beams of light filtering through the canopy",
			imageUrl: "https://cdn.sanity.io/images/example/production/forest-cathedral.jpg",
			lqip: undefined,
			galleryTitle: "Landscapes",
			gallerySlug: "landscapes",
			availableSizes: [
				{ width: 4, height: 6, label: "4×6" },
				{ width: 8, height: 10, label: "8×10" },
				{ width: 11, height: 14, label: "11×14" },
				{ width: 16, height: 20, label: "16×20" },
			],
		},
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
