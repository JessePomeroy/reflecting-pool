// Types for admin dashboard

import type { OrderStatus } from "$lib/shop/types";

export type { OrderStatus };

/** Full order with shipping details */
export interface AdminOrder {
	_id: string;
	orderNumber: string;
	date: string;
	customerName: string;
	customerEmail: string;
	items: OrderItem[];
	total: number;
	subtotal: number;
	stripeFee: number;
	netRevenue: number;
	status: OrderStatus;
	paperName: string;
	paperSize: string;
	shippingAddress: {
		line1: string;
		line2?: string;
		city: string;
		state: string;
		postalCode: string;
		country: string;
	};
	lumaprintsOrderNumber?: string;
	trackingNumber?: string;
	trackingUrl?: string;
	shippingCarrier?: string;
	internalNotes?: string;
	createdAt: string;
	shippedAt?: string;
}

/** Item in an order */
export interface OrderItem {
	id: string;
	title: string;
	imageUrl: string;
	paperSize: string;
	paperType: string;
	quantity: number;
	price: number;
}

/** Inquiry from contact form */
export interface Inquiry {
	_id: string;
	date: string;
	name: string;
	email: string;
	phone?: string;
	subject: string;
	message: string;
	status: "new" | "read" | "replied";
	submittedAt: string;
}

/** Gallery for admin overview */
export interface AdminGallery {
	_id: string;
	title: string;
	slug: string;
	imageCount: number;
	printAvailableCount: number;
	isVisible: boolean;
}

/** Revenue stats */
export interface RevenueStats {
	filtered: number;
	allTime: number;
	averageOrder: number;
	today: number;
	thisWeek: number;
	thisMonth: number;
}

/** Daily revenue for sparkline */
export interface DailyRevenue {
	date: string;
	amount: number;
}
