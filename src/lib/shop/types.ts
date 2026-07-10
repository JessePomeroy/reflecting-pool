// Types for the print shop integration

/** Available print dimensions (inches) */
export interface PrintDimensions {
	width: number;
	height: number;
	label: string; // e.g., "8×10"
}

/** A print product displayed in the shop */
export interface PrintProduct {
	id: string;
	title: string;
	slug: string;
	caption?: string;
	alt: string;
	imageUrl: string;
	/** Low-quality image placeholder (base64 from Sanity) */
	lqip?: string;
	galleryTitle: string;
	gallerySlug: string;
	availableSizes: PrintDimensions[];
}

/** A curated collection of prints */
export interface PrintCollection {
	id: string;
	title: string;
	slug: string;
	description?: string;
	coverImage: string;
	printCount: number;
}

/** Stripe checkout metadata (attached to session) */
export interface CheckoutMetadata {
	imageUrl: string;
	imageTitle: string;
	paperSubcategoryId: string;
	paperWidth: string;
	paperHeight: string;
	paperName: string;
	paperSizeLabel: string;
	productSlug: string;
}
