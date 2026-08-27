import { V2_SIZES } from "@jessepomeroy/print-catalog";
import type { PrintCollection, PrintProduct } from "$lib/shop/types";

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

/**
 * Fetch all printable images across all galleries.
 * TODO: Replace fallback data with real Sanity query when Maggie's print catalog is ready.
 */
export async function fetchPrintableProducts(): Promise<PrintProduct[]> {
	// TODO: Use _PRINTABLE_IMAGES_QUERY when Sanity print catalog documents are complete.
	return getFallbackPrintProducts();
}

/**
 * Fetch all print collections.
 * TODO: Replace fallback data with real Sanity query when Maggie's print catalog is ready.
 */
export async function fetchCollections(): Promise<PrintCollection[]> {
	// TODO: Use _COLLECTIONS_QUERY when Sanity print catalog documents are complete.
	return getFallbackPrintCollections();
}

/**
 * Fetch a single collection with its prints by slug.
 * TODO: Replace fallback data with real Sanity query when Maggie's print catalog is ready.
 */
export async function fetchCollectionWithPrints(
	slug: string,
): Promise<{ collection: PrintCollection; prints: PrintProduct[] } | null> {
	// TODO: Use _COLLECTION_WITH_PRINTS_QUERY when Sanity print catalog documents are complete.
	return getFallbackCollectionWithPrints(slug);
}

/**
 * Fetch a single printable image by its slug.
 * TODO: Replace fallback data with real Sanity query when Maggie's print catalog is ready.
 */
export async function fetchPrintProduct(slug: string): Promise<PrintProduct | null> {
	// TODO: Use _SINGLE_PRINT_QUERY when Sanity print catalog documents are complete.
	return getFallbackPrintProducts().find((product) => product.slug === slug) ?? null;
}

export function getFallbackCollectionWithPrints(
	slug: string,
): { collection: PrintCollection; prints: PrintProduct[] } | null {
	const collection = getFallbackPrintCollections().find((item) => item.slug === slug);
	if (!collection) return null;

	const prints = getFallbackPrintProducts().filter((product) => product.gallerySlug === slug);
	return { collection, prints };
}

export function getFallbackPrintCollections(): PrintCollection[] {
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

const DEFAULT_SIZES = V2_SIZES.map((size) => ({
	width: size.width,
	height: size.height,
	label: size.label,
}));

export function getFallbackPrintProducts(): PrintProduct[] {
	return [
		makeFallbackPrint("01", "Spring Meadow", "Wildflowers", "wildflowers"),
		makeFallbackPrint("02", "Roadside Daisies", "Wildflowers", "wildflowers"),
		makeFallbackPrint("03", "Prairie Fire", "Wildflowers", "wildflowers"),
		makeFallbackPrint("04", "Clover Patch", "Wildflowers", "wildflowers"),
		makeFallbackPrint("05", "Violet Hour", "Wildflowers", "wildflowers"),
		makeFallbackPrint("06", "Goldenrod", "Wildflowers", "wildflowers"),
		makeFallbackPrint("07", "Wild Aster", "Wildflowers", "wildflowers"),
		makeFallbackPrint("08", "Peony Blush", "Garden Portraits", "garden-portraits"),
		makeFallbackPrint("09", "Rose Study", "Garden Portraits", "garden-portraits"),
		makeFallbackPrint("10", "Dahlia Crown", "Garden Portraits", "garden-portraits"),
		makeFallbackPrint("11", "Hydrangea Blue", "Garden Portraits", "garden-portraits"),
		makeFallbackPrint("12", "Iris at Dawn", "Garden Portraits", "garden-portraits"),
		makeFallbackPrint("13", "Tulip Flame", "Garden Portraits", "garden-portraits"),
		makeFallbackPrint("14", "Lily of the Valley", "Garden Portraits", "garden-portraits"),
		makeFallbackPrint("15", "Petal Grain", "Close-ups", "close-ups"),
		makeFallbackPrint("16", "Stamen Detail", "Close-ups", "close-ups"),
		makeFallbackPrint("17", "Dew on Silk", "Close-ups", "close-ups"),
		makeFallbackPrint("18", "Pollen Dust", "Close-ups", "close-ups"),
		makeFallbackPrint("19", "Unfurling", "Close-ups", "close-ups"),
		makeFallbackPrint("20", "Translucent Petal", "Close-ups", "close-ups"),
		makeFallbackPrint("21", "Inner Light", "Close-ups", "close-ups"),
		makeFallbackPrint("22", "Shadow Rose", "Moody Blooms", "moody-blooms"),
		makeFallbackPrint("24", "Bruised Petals", "Moody Blooms", "moody-blooms"),
		makeFallbackPrint("25", "Fade to Black", "Moody Blooms", "moody-blooms"),
		makeFallbackPrint("26", "Wilting Grace", "Moody Blooms", "moody-blooms"),
		makeFallbackPrint("27", "Last Light", "Moody Blooms", "moody-blooms"),
		makeFallbackPrint("28", "Lavender Fields", "Panoramic", "panoramic"),
		makeFallbackPrint("29", "Sunflower Row", "Panoramic", "panoramic"),
		makeFallbackPrint("30", "Garden Path", "Panoramic", "panoramic"),
		makeFallbackPrint("31", "Hillside Bloom", "Panoramic", "panoramic"),
		makeFallbackPrint("32", "Morning Mist", "Panoramic", "panoramic"),
		makeFallbackPrint("33", "Flower Market", "Panoramic", "panoramic"),
		makeFallbackPrint("34", "Golden Hour Field", "Panoramic", "panoramic"),
		makeFallbackPrint("35", "Distant Blooms", "Panoramic", "panoramic"),
	];
}

function makeFallbackPrint(
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
