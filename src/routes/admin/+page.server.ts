import { getMockDailyRevenue, getMockOrders, getMockRevenueStats } from "$lib/admin/data";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async () => {
	// TODO: Add auth middleware — check for admin session/cookie before allowing access

	const orders = getMockOrders();
	const stats = getMockRevenueStats();
	const dailyRevenue = getMockDailyRevenue();

	// Recent orders (last 10)
	const recentOrders = orders.slice(0, 10).map((order) => ({
		_id: order._id,
		orderNumber: order.orderNumber,
		date: order.date,
		customerName: order.customerName,
		total: order.total,
		status: order.status,
	}));

	return {
		stats,
		recentOrders,
		dailyRevenue,
	};
};
