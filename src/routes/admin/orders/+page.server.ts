// Orders admin page server load

import { getMockOrders } from "$lib/admin/data";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ url }) => {
	// TODO: Add auth middleware — check for admin session/cookie before allowing access

	const orders = getMockOrders();

	// Get filter params
	const statusFilter = url.searchParams.get("status") || "";
	const searchQuery = url.searchParams.get("search") || "";
	const dateFilter = url.searchParams.get("date") || "all";

	// Apply filters
	let filteredOrders = [...orders];

	if (statusFilter) {
		filteredOrders = filteredOrders.filter((o) => o.status === statusFilter);
	}

	if (searchQuery) {
		const query = searchQuery.toLowerCase();
		filteredOrders = filteredOrders.filter(
			(o) =>
				o.customerName.toLowerCase().includes(query) ||
				o.customerEmail.toLowerCase().includes(query) ||
				o.orderNumber.toLowerCase().includes(query),
		);
	}

	if (dateFilter && dateFilter !== "all") {
		const now = new Date();
		let startDate: Date;

		switch (dateFilter) {
			case "today":
				startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
				break;
			case "week":
				startDate = new Date(now.getTime() - now.getDay() * 24 * 60 * 60 * 1000);
				break;
			case "month":
				startDate = new Date(now.getFullYear(), now.getMonth(), 1);
				break;
			default:
				startDate = new Date(0);
		}

		filteredOrders = filteredOrders.filter((o) => new Date(o.createdAt) >= startDate);
	}

	// Calculate revenue summary for filtered results
	const totalRevenue = filteredOrders.reduce((sum, o) => sum + o.total, 0);
	const totalFees = filteredOrders.reduce((sum, o) => sum + o.stripeFee, 0);
	const netRevenue = filteredOrders.reduce((sum, o) => sum + o.netRevenue, 0);

	return {
		// Summary rows for the table
		orders: filteredOrders.map((order) => ({
			_id: order._id,
			orderNumber: order.orderNumber,
			date: order.date,
			customerName: order.customerName,
			customerEmail: order.customerEmail,
			itemCount: order.items.length,
			total: order.total,
			status: order.status,
		})),
		// Full order objects needed for the detail modal
		fullOrders: filteredOrders,
		filters: {
			status: statusFilter,
			search: searchQuery,
			date: dateFilter,
		},
		summary: {
			totalOrders: filteredOrders.length,
			totalRevenue,
			stripeFees: totalFees,
			netRevenue,
		},
	};
};
