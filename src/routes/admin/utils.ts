// Admin utility functions

/** Format currency for display */
export function formatCurrency(amount: number): string {
	return new Intl.NumberFormat("en-US", {
		style: "currency",
		currency: "USD",
	}).format(amount);
}

/** Format date for display */
export function formatDate(dateStr: string): string {
	const date = new Date(dateStr);
	return date.toLocaleDateString("en-US", {
		month: "short",
		day: "numeric",
		year: "numeric",
	});
}

/** Format date with time */
export function formatDateTime(dateStr: string): string {
	const date = new Date(dateStr);
	return date.toLocaleDateString("en-US", {
		month: "short",
		day: "numeric",
		year: "numeric",
		hour: "numeric",
		minute: "2-digit",
	});
}

/** Format status for display */
export function formatStatus(status: string): string {
	return status.replace(/_/g, " ");
}

/** Order status options */
export const ORDER_STATUSES = [
	{ value: "processing", label: "Processing" },
	{ value: "submitted", label: "Submitted" },
	{ value: "printing", label: "Printing" },
	{ value: "shipped", label: "Shipped" },
	{ value: "delivered", label: "Delivered" },
	{ value: "refunded", label: "Refunded" },
	{ value: "fulfillment_error", label: "Fulfillment Error" },
	{ value: "cancelled", label: "Cancelled" },
] as const;

/** Get color class for status */
export function getStatusColor(status: string): string {
	const colors: Record<string, string> = {
		processing: "bg-blue-500",
		submitted: "bg-yellow-500",
		printing: "bg-purple-500",
		shipped: "bg-orange-500",
		delivered: "bg-green-500",
		refunded: "bg-red-500",
		fulfillment_error: "bg-red-600",
		cancelled: "bg-gray-500",
		new: "bg-red-500",
		read: "bg-yellow-500",
		replied: "bg-green-500",
	};
	return colors[status] || "bg-gray-500";
}

// Date filter presets
export const DATE_FILTERS = [
	{ value: "today", label: "Today" },
	{ value: "week", label: "This Week" },
	{ value: "month", label: "This Month" },
	{ value: "all", label: "All Time" },
] as const;
