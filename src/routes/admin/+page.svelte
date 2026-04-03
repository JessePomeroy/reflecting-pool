<script lang="ts">
import type { PageData } from "./$types";
import { formatCurrency, formatDate } from "./utils";

let { data }: { data: PageData } = $props();

// Calculate max for sparkline scaling
const maxRevenue = $derived(Math.max(...data.dailyRevenue.map((d) => d.amount), 1));

// Status badge colors
function getStatusColor(status: string): string {
	const colors: Record<string, string> = {
		processing: "bg-blue-500",
		submitted: "bg-yellow-500",
		printing: "bg-purple-500",
		shipped: "bg-orange-500",
		delivered: "bg-green-500",
		refunded: "bg-red-500",
		fulfillment_error: "bg-red-600",
		cancelled: "bg-gray-500",
	};
	return colors[status] || "bg-gray-500";
}

function formatStatus(status: string): string {
	return status.replace(/_/g, " ");
}
</script>

<svelte:head>
	<title>Dashboard · Admin</title>
</svelte:head>

<div class="dashboard">
	<header class="page-header">
		<h1>Dashboard</h1>
		<p class="subtitle">Welcome back. Here's what's happening with your shop.</p>
	</header>

	<!-- Stats Cards -->
	<section class="stats-grid">
		<div class="stat-card">
			<span class="stat-label">Today</span>
			<span class="stat-value">{formatCurrency(data.stats.today)}</span>
			<span class="stat-detail">{data.stats.today > 0 ? "revenue" : "no orders yet"}</span>
		</div>
		<div class="stat-card">
			<span class="stat-label">This Week</span>
			<span class="stat-value">{formatCurrency(data.stats.thisWeek)}</span>
			<span class="stat-detail">revenue</span>
		</div>
		<div class="stat-card">
			<span class="stat-label">This Month</span>
			<span class="stat-value">{formatCurrency(data.stats.thisMonth)}</span>
			<span class="stat-detail">revenue</span>
		</div>
		<div class="stat-card highlight">
			<span class="stat-label">All-Time Revenue</span>
			<span class="stat-value">{formatCurrency(data.stats.allTime)}</span>
			<span class="stat-detail">average {formatCurrency(data.stats.averageOrder)}/order</span>
		</div>
	</section>

	<!-- Revenue Sparkline -->
	<section class="sparkline-section">
		<h2>Revenue (Last 30 Days)</h2>
		<div class="sparkline">
			{#each data.dailyRevenue as day (day.date)}
				<div class="sparkline-bar-wrapper" title="{day.date}: {formatCurrency(day.amount)}">
					<div
						class="sparkline-bar"
						style="height: {(day.amount / maxRevenue) * 100}%"
					></div>
				</div>
			{/each}
		</div>
		<div class="sparkline-labels">
			<span>{data.dailyRevenue[0]?.date.slice(5)}</span>
			<span>{data.dailyRevenue[Math.floor(data.dailyRevenue.length / 2)]?.date.slice(
				5,
			)}</span>
			<span>{data.dailyRevenue[data.dailyRevenue.length - 1]?.date.slice(5)}</span>
		</div>
	</section>

	<!-- Recent Orders -->
	<section class="recent-orders">
		<div class="section-header">
			<h2>Recent Orders</h2>
			<a href="/admin/orders" class="view-all">View all →</a>
		</div>

		{#if data.recentOrders.length === 0}
			<div class="empty-state">
				<p>No orders yet.</p>
			</div>
		{:else}
			<div class="orders-table-wrapper">
				<table class="orders-table">
					<thead>
						<tr>
							<th>Order</th>
							<th>Date</th>
							<th>Customer</th>
							<th>Total</th>
							<th>Status</th>
						</tr>
					</thead>
					<tbody>
						{#each data.recentOrders as order (order._id)}
							<tr>
								<td class="order-number">{order.orderNumber}</td>
								<td class="order-date">{formatDate(order.date)}</td>
								<td class="order-customer">{order.customerName}</td>
								<td class="order-total">{formatCurrency(order.total)}</td>
								<td>
									<span class="status-badge {getStatusColor(order.status)}">
										{formatStatus(order.status)}
									</span>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{/if}
	</section>
</div>

<style>
	.dashboard {
		max-width: 1200px;
	}

	.page-header {
		margin-bottom: 2rem;
	}

	.page-header h1 {
		font-size: 1.875rem;
		font-weight: 600;
		color: #f9fafb;
		margin-bottom: 0.25rem;
	}

	.subtitle {
		color: #9ca3af;
		font-size: 0.9375rem;
	}

	/* Stats Grid */
	.stats-grid {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: 1rem;
		margin-bottom: 2rem;
	}

	.stat-card {
		background: #1f2937;
		border-radius: 0.5rem;
		padding: 1.25rem;
		border: 1px solid #374151;
	}

	.stat-card.highlight {
		background: linear-gradient(135deg, #065f46 0%, #047857 100%);
		border-color: #10b981;
	}

	.stat-label {
		display: block;
		font-size: 0.875rem;
		color: #9ca3af;
		margin-bottom: 0.25rem;
	}

	.stat-value {
		display: block;
		font-size: 1.5rem;
		font-weight: 600;
		color: #f9fafb;
	}

	.stat-detail {
		display: block;
		font-size: 0.8125rem;
		color: #6b7280;
		margin-top: 0.25rem;
	}

	.stat-card.highlight .stat-detail {
		color: #d1fae5;
	}

	/* Sparkline */
	.sparkline-section {
		background: #1f2937;
		border-radius: 0.5rem;
		padding: 1.25rem;
		border: 1px solid #374151;
		margin-bottom: 2rem;
	}

	.sparkline-section h2 {
		font-size: 1rem;
		font-weight: 500;
		color: #e5e7eb;
		margin-bottom: 1rem;
	}

	.sparkline {
		display: flex;
		align-items: flex-end;
		gap: 2px;
		height: 80px;
	}

	.sparkline-bar-wrapper {
		flex: 1;
		height: 100%;
		display: flex;
		align-items: flex-end;
	}

	.sparkline-bar {
		width: 100%;
		background: #10b981;
		border-radius: 2px 2px 0 0;
		min-height: 2px;
		transition: height 0.2s ease;
	}

	.sparkline-bar-wrapper:hover .sparkline-bar {
		background: #34d399;
	}

	.sparkline-labels {
		display: flex;
		justify-content: space-between;
		margin-top: 0.5rem;
		font-size: 0.75rem;
		color: #6b7280;
	}

	/* Recent Orders */
	.recent-orders {
		background: #1f2937;
		border-radius: 0.5rem;
		padding: 1.25rem;
		border: 1px solid #374151;
	}

	.section-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 1rem;
	}

	.section-header h2 {
		font-size: 1rem;
		font-weight: 500;
		color: #e5e7eb;
	}

	.view-all {
		color: #10b981;
		text-decoration: none;
		font-size: 0.875rem;
	}

	.view-all:hover {
		text-decoration: underline;
	}

	.orders-table-wrapper {
		overflow-x: auto;
	}

	.orders-table {
		width: 100%;
		border-collapse: collapse;
		font-size: 0.875rem;
	}

	.orders-table th {
		text-align: left;
		padding: 0.75rem 0.5rem;
		color: #6b7280;
		font-weight: 500;
		border-bottom: 1px solid #374151;
	}

	.orders-table td {
		padding: 0.75rem 0.5rem;
		color: #e5e7eb;
		border-bottom: 1px solid #374151;
	}

	.orders-table tr:last-child td {
		border-bottom: none;
	}

	.order-number {
		font-weight: 500;
		color: #10b981;
	}

	.order-date {
		color: #9ca3af;
	}

	.order-total {
		font-weight: 500;
	}

	/* Status Badge */
	.status-badge {
		display: inline-block;
		padding: 0.25rem 0.625rem;
		border-radius: 9999px;
		font-size: 0.75rem;
		font-weight: 500;
		text-transform: capitalize;
		color: white;
	}

	/* Empty State */
	.empty-state {
		padding: 2rem;
		text-align: center;
		color: #6b7280;
	}

	/* Responsive */
	@media (max-width: 1024px) {
		.stats-grid {
			grid-template-columns: repeat(2, 1fr);
		}
	}

	@media (max-width: 640px) {
		.stats-grid {
			grid-template-columns: 1fr;
		}
	}
</style>