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

/**
 * Return the status key used for styling. Each admin page defines
 * `[data-status="..."]` selectors matching these keys in its `<style>` block.
 * (Kept for backwards compatibility — prefer using the `status` value directly
 * as `data-status={order.status}`.)
 */
export function getStatusColor(status: string): string {
	return status || "cancelled";
}

// Date filter presets
export const DATE_FILTERS = [
	{ value: "today", label: "Today" },
	{ value: "week", label: "This Week" },
	{ value: "month", label: "This Month" },
	{ value: "all", label: "All Time" },
] as const;
