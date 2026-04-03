// Types for the print shop integration

/** Paper types available from LumaPrints (Fine Art Paper category 103) */
export type PaperType = "Archival Matte" | "Glossy";

/** LumaPrints subcategory IDs for paper types */
export const PAPER_SUBCATEGORY_IDS: Record<PaperType, number> = {
	"Archival Matte": 103001,
	Glossy: 103007,
};

/** Available print dimensions (inches) */
export interface PrintDimensions {
	width: number;
	height: number;
	label: string; // e.g., "8×10"
}

export const AVAILABLE_SIZES: PrintDimensions[] = [
	{ width: 4, height: 6, label: "4×6" },
	{ width: 8, height: 10, label: "8×10" },
	{ width: 11, height: 14, label: "11×14" },
	{ width: 16, height: 20, label: "16×20" },
];

/** A paper option with subcategory ID for LumaPrints */
export interface PaperOption {
	name: PaperType;
	subcategoryId: number;
	description: string;
}

export const PAPER_OPTIONS: PaperOption[] = [
	{
		name: "Archival Matte",
		subcategoryId: 103001,
		description: "Museum-quality archival matte — rich tones, no glare",
	},
	{
		name: "Glossy",
		subcategoryId: 103007,
		description: "Vibrant glossy finish — vivid colors, high contrast",
	},
];

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

/** Shipping address for an order */
export interface ShippingAddress {
	line1: string;
	line2?: string;
	city: string;
	state: string;
	postalCode: string;
	country: string;
}

/** Order recipient */
export interface Recipient {
	firstName: string;
	lastName: string;
	address1: string;
	address2?: string;
	city: string;
	state: string;
	zip: string;
	country: string;
	phone?: string;
}

/** Order status in Sanity */
export type OrderStatus =
	| "processing"
	| "submitted"
	| "printing"
	| "shipped"
	| "delivered"
	| "fulfillment_error"
	| "cancelled"
	| "refunded";

/** An order tracked in Sanity */
export interface Order {
	_id: string;
	stripeSessionId: string;
	customerName: string;
	customerEmail: string;
	status: OrderStatus;
	paperName: string;
	paperSize: string;
	amount: number;
	lumaprintsOrderNumber?: string;
	trackingNumber?: string;
	trackingUrl?: string;
	shippingCarrier?: string;
	fulfillmentError?: string;
	createdAt: string;
	shippedAt?: string;
}

/** Item for LumaPrints order submission */
export interface OrderItem {
	imageUrl: string;
	paperSubcategoryId: number;
	width: number;
	height: number;
	quantity: number;
}

/** LumaPrints API order payload */
export interface LumaPrintsOrder {
	externalId: string;
	storeId: number;
	shippingMethod: string;
	recipient: {
		firstName: string;
		lastName: string;
		addressLine1: string;
		addressLine2: string;
		city: string;
		state: string;
		zipCode: string;
		country: string;
		phone: string;
	};
	orderItems: {
		externalItemId: string;
		subcategoryId: number;
		quantity: number;
		width: number;
		height: number;
		file: { imageUrl: string };
		orderItemOptions: number[];
	}[];
}

/** LumaPrints API order response */
export interface LumaPrintsOrderResponse {
	orderNumber: string;
	status: string;
}

/** LumaPrints shipment info */
export interface LumaPrintsShipment {
	orderNumber: string;
	trackingNumber: string;
	trackingUrl: string;
	carrier: string;
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
