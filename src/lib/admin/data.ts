// Mock data for admin dashboard development
// TODO: Replace with real Sanity queries once connected

import type {
	AdminGallery,
	AdminOrder,
	DailyRevenue,
	Inquiry,
	OrderStatus,
	RevenueStats,
} from "./types";

// Helper to generate random date within range
function randomDate(start: Date, end: Date): Date {
	return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

// Generate 18 mock orders
function generateMockOrders(): AdminOrder[] {
	const statuses: OrderStatus[] = [
		"processing",
		"submitted",
		"printing",
		"shipped",
		"delivered",
		"processing",
		"shipped",
		"delivered",
		"refunded",
		"processing",
		"printing",
		"shipped",
		"processing",
		"delivered",
		"submitted",
		"shipped",
		"delivered",
		"refunded",
	];

	const firstNames = [
		"Emma",
		"Oliver",
		"Sophia",
		"Liam",
		"Isabella",
		"Noah",
		"Ava",
		"Ethan",
		"Mia",
		"James",
		"Charlotte",
		"Benjamin",
		"Amelia",
		"Lucas",
		"Harper",
		"Mason",
		"Evelyn",
		"Alexander",
	];
	const lastNames = [
		"Smith",
		"Johnson",
		"Williams",
		"Brown",
		"Jones",
		"Garcia",
		"Miller",
		"Davis",
		"Rodriguez",
		"Martinez",
		"Hernandez",
		"Lopez",
		"Gonzalez",
		"Wilson",
		"Anderson",
		"Thomas",
		"Taylor",
		"Moore",
		"Jackson",
	];

	const paperSizes = ["4×6", "8×10", "11×14", "16×20"];
	const paperTypes = ["Archival Matte", "Glossy"];
	const imageTitles = [
		"Spring Meadow",
		"Roadside Daisies",
		"Prairie Fire",
		"Peony Blush",
		"Rose Study",
		"Dahlia Crown",
		"Hydrangea Blue",
		"Petal Grain",
		"Dew on Silk",
		"Shadow Rose",
		"Lavender Fields",
		"Sunflower Row",
	];

	const orders: AdminOrder[] = [];
	const now = new Date();
	const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
	const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

	for (let i = 0; i < 18; i++) {
		const firstName = firstNames[i % firstNames.length];
		const lastName = lastNames[i % lastNames.length];
		const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}@example.com`;
		const orderDate = randomDate(sixtyDaysAgo, now);
		const status = statuses[i];
		const quantity = Math.floor(Math.random() * 2) + 1;
		const unitPrice = [25, 45, 85, 150][Math.floor(Math.random() * 4)];
		const subtotal = unitPrice * quantity;
		const stripeFee = Math.round(subtotal * 0.029 + 30) / 100;
		const total = subtotal + 9.99;

		const order: AdminOrder = {
			_id: `order-${1000 + i}`,
			orderNumber: `RP-${1000 + i}`,
			date: orderDate.toISOString(),
			customerName: `${firstName} ${lastName}`,
			customerEmail: email,
			items: [
				{
					id: `item-${i}`,
					title: imageTitles[i % imageTitles.length],
					imageUrl: `/images/flower-${String((i % 35) + 1).padStart(2, "0")}.jpg`,
					paperSize: paperSizes[i % paperSizes.length],
					paperType: paperTypes[i % paperTypes.length],
					quantity,
					price: unitPrice,
				},
			],
			subtotal,
			stripeFee: Math.round(stripeFee * 100) / 100,
			total,
			netRevenue: Math.round((subtotal - stripeFee - 9.99) * 100) / 100,
			status,
			paperName: paperTypes[i % paperTypes.length],
			paperSize: paperSizes[i % paperSizes.length],
			shippingAddress: {
				line1: `${100 + i * 10} ${["Oak", "Maple", "Pine", "Cedar", "Elm"][i % 5]} Street`,
				city: ["Portland", "Seattle", "San Francisco", "Denver", "Austin"][i % 5],
				state: ["OR", "WA", "CA", "CO", "TX"][i % 5],
				postalCode: `${90000 + i * 1000}`,
				country: "US",
			},
			internalNotes: i === 5 || i === 12 ? "Customer requested rush processing" : undefined,
			createdAt: orderDate.toISOString(),
		};

		if (status === "shipped" || status === "delivered") {
			order.lumaprintsOrderNumber = `LP-${2000 + i}`;
			order.trackingNumber = `1Z999AA10123456784`;
			order.trackingUrl = "https://tools.usps.com";
			order.shippingCarrier = "UPS";
			order.shippedAt = new Date(orderDate.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString();
		}

		orders.push(order);
	}

	return orders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

// Generate mock inquiries
function generateMockInquiries(): Inquiry[] {
	const inquiries: Inquiry[] = [
		{
			_id: "inq-1",
			name: "Sarah Johnson",
			email: "sarah.j@email.com",
			phone: "503-555-0123",
			subject: "Portrait Session Inquiry",
			message:
				"Hi Margaret, I'm interested in booking a portrait session for my mother. She just turned 70 and we'd love to capture some special moments with her grandchildren. What's your availability in late May?",
			status: "new",
			date: new Date().toISOString(),
			submittedAt: new Date().toISOString(),
		},
		{
			_id: "inq-2",
			name: "Michael Chen",
			email: "m.chen@techfirm.io",
			phone: "206-555-0456",
			subject: "Wedding Photography",
			message:
				"Our wedding is scheduled for September 15th at the Portland Japanese Garden. We're looking for a photographer who specializes in capturing candid moments. Could you send us your portfolio and pricing?",
			status: "read",
			date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
			submittedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
		},
		{
			_id: "inq-3",
			name: "Emily Rodriguez",
			email: "emily.r@artgallery.org",
			subject: "Print Purchase Question",
			message:
				"I love your 'Moody Blooms' collection! I'm interested in purchasing a 16×20 of Shadow Rose for our gallery. Do you offer trade pricing for gallery purchases?",
			status: "replied",
			date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
			submittedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
		},
		{
			_id: "inq-4",
			name: "David Park",
			email: "david.park@corporate.com",
			phone: "360-555-0789",
			subject: "Corporate Office Art",
			message:
				"We're furnishing our new office space in downtown Seattle and looking for series of botanical photographs for the conference rooms. Looking for around 8-10 pieces.",
			status: "new",
			date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
			submittedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
		},
		{
			_id: "inq-5",
			name: "Lisa Thompson",
			email: "lisa.t@studio.com",
			subject: "Collaboration Opportunity",
			message:
				"I'm a floral designer based in Portland and I'd love to discuss a potential collaboration. I think our aesthetics complement each other beautifully.",
			status: "read",
			date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
			submittedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
		},
		{
			_id: "inq-6",
			name: "James Wilson",
			email: "jwilson@collector.net",
			subject: "Print Size Question",
			message:
				"I purchased 'Golden Hour Field' last year and love it. I'm looking to add another piece but wonder if you offer custom sizing? Specifically interested in around 24×36.",
			status: "replied",
			date: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
			submittedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
		},
		{
			_id: "inq-7",
			name: "Amanda Foster",
			email: "amanda.f@eventplan.io",
			phone: "503-555-0321",
			subject: "Event Photography",
			message:
				"We're planning our company's 25th anniversary gala and need a photographer for the evening. It's a black-tie event at the Sentinel Hotel.",
			status: "new",
			date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
			submittedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
		},
	];

	return inquiries;
}

// Generate mock galleries
function generateMockGalleries(): AdminGallery[] {
	return [
		{
			_id: "gal-wildflowers",
			title: "Wildflowers",
			slug: "wildflowers",
			imageCount: 7,
			printAvailableCount: 7,
			isVisible: true,
		},
		{
			_id: "gal-garden-portraits",
			title: "Garden Portraits",
			slug: "garden-portraits",
			imageCount: 7,
			printAvailableCount: 7,
			isVisible: true,
		},
		{
			_id: "gal-close-ups",
			title: "Close-ups",
			slug: "close-ups",
			imageCount: 7,
			printAvailableCount: 7,
			isVisible: true,
		},
		{
			_id: "gal-moody-blooms",
			title: "Moody Blooms",
			slug: "moody-blooms",
			imageCount: 5,
			printAvailableCount: 5,
			isVisible: true,
		},
		{
			_id: "gal-panoramic",
			title: "Panoramic",
			slug: "panoramic",
			imageCount: 8,
			printAvailableCount: 8,
			isVisible: true,
		},
	];
}

// Calculate revenue stats from orders
function calculateRevenueStats(orders: AdminOrder[]): RevenueStats {
	const now = new Date();
	const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
	const startOfWeek = new Date(
		startOfToday.getTime() - startOfToday.getDay() * 24 * 60 * 60 * 1000,
	);
	const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

	const allTime = orders.reduce((sum, o) => sum + o.total, 0);
	const filtered = orders.reduce((sum, o) => sum + o.total, 0);
	const today = orders
		.filter((o) => new Date(o.createdAt) >= startOfToday)
		.reduce((sum, o) => sum + o.total, 0);
	const thisWeek = orders
		.filter((o) => new Date(o.createdAt) >= startOfWeek)
		.reduce((sum, o) => sum + o.total, 0);
	const thisMonth = orders
		.filter((o) => new Date(o.createdAt) >= startOfMonth)
		.reduce((sum, o) => sum + o.total, 0);

	return {
		filtered,
		allTime,
		averageOrder: orders.length > 0 ? allTime / orders.length : 0,
		today,
		thisWeek,
		thisMonth,
	};
}

// Generate daily revenue for sparkline (last 30 days)
function generateDailyRevenue(orders: AdminOrder[]): DailyRevenue[] {
	const now = new Date();
	const result: DailyRevenue[] = [];

	for (let i = 29; i >= 0; i--) {
		const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
		const dateStr = date.toISOString().split("T")[0];
		const dayOrders = orders.filter((o) => o.createdAt.split("T")[0] === dateStr);
		result.push({
			date: dateStr,
			amount: dayOrders.reduce((sum, o) => sum + o.total, 0),
		});
	}

	return result;
}

// Cache the mock data
let cachedOrders: AdminOrder[] | null = null;
let cachedInquiries: Inquiry[] | null = null;
let cachedGalleries: AdminGallery[] | null = null;

export function getMockOrders(): AdminOrder[] {
	if (!cachedOrders) {
		cachedOrders = generateMockOrders();
	}
	return cachedOrders;
}

export function getMockInquiries(): Inquiry[] {
	if (!cachedInquiries) {
		cachedInquiries = generateMockInquiries();
	}
	return cachedInquiries;
}

export function getMockGalleries(): AdminGallery[] {
	if (!cachedGalleries) {
		cachedGalleries = generateMockGalleries();
	}
	return cachedGalleries;
}

export function getMockRevenueStats(): RevenueStats {
	return calculateRevenueStats(getMockOrders());
}

export function getMockDailyRevenue(): DailyRevenue[] {
	return generateDailyRevenue(getMockOrders());
}
