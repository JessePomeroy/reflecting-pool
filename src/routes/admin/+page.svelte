<script lang="ts">
import type { PageData } from "./$types";
import { formatCurrency, formatDate, formatStatus } from "./utils";

let { data }: { data: PageData } = $props();

// Calculate max for sparkline scaling
const maxRevenue = $derived(Math.max(...data.dailyRevenue.map((d) => d.amount), 1));
</script>

<svelte:head>
	<title>Dashboard · Admin</title>
</svelte:head>

<div class="dashboard">
	<header class="page-header">
		<h1>Dashboard</h1>
		<p class="subtitle">An overview of recent activity.</p>
	</header>

	<!-- Stats Cards -->
	<section class="stats-grid">
		<div class="stat-card">
			<span class="stat-label">Today</span>
			<span class="stat-value">{formatCurrency(data.stats.today)}</span>
			<span class="stat-detail">{data.stats.today > 0 ? "revenue" : "no orders yet"}</span>
		</div>
		<div class="stat-card">
			<span class="stat-label">This week</span>
			<span class="stat-value">{formatCurrency(data.stats.thisWeek)}</span>
			<span class="stat-detail">revenue</span>
		</div>
		<div class="stat-card">
			<span class="stat-label">This month</span>
			<span class="stat-value">{formatCurrency(data.stats.thisMonth)}</span>
			<span class="stat-detail">revenue</span>
		</div>
		<div class="stat-card highlight">
			<span class="stat-label">All-time</span>
			<span class="stat-value">{formatCurrency(data.stats.allTime)}</span>
			<span class="stat-detail">avg {formatCurrency(data.stats.averageOrder)} / order</span>
		</div>
	</section>

	<!-- Revenue Sparkline -->
	<section class="panel">
		<h2>Revenue — last 30 days</h2>
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
			<span>{data.dailyRevenue[Math.floor(data.dailyRevenue.length / 2)]?.date.slice(5)}</span>
			<span>{data.dailyRevenue[data.dailyRevenue.length - 1]?.date.slice(5)}</span>
		</div>
	</section>

	<!-- Recent Orders -->
	<section class="panel">
		<div class="section-header">
			<h2>Recent orders</h2>
			<a href="/admin/orders" class="view-all">View all →</a>
		</div>

		{#if data.recentOrders.length === 0}
			<div class="empty-state">
				<p>No orders yet.</p>
			</div>
		{:else}
			<div class="table-wrapper">
				<table class="data-table">
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
								<td class="muted">{formatDate(order.date)}</td>
								<td>{order.customerName}</td>
								<td class="numeric">{formatCurrency(order.total)}</td>
								<td>
									<span class="status-badge" data-status={order.status}>
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
		font-family: var(--font-serif);
		font-size: 2rem;
		font-weight: 400;
		letter-spacing: 0.01em;
		color: var(--admin-heading);
		margin: 0 0 0.25rem;
	}

	.subtitle {
		color: var(--admin-text-muted);
		font-size: 0.9375rem;
	}

	/* Stats Grid */
	.stats-grid {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: 1rem;
		margin-bottom: 1.5rem;
	}

	.stat-card {
		background: var(--admin-surface);
		border-radius: 3px;
		padding: 1.25rem;
		border: 1px solid var(--admin-border);
	}

	.stat-card.highlight {
		background: var(--admin-surface-raised);
		border-color: var(--admin-border-strong);
	}

	.stat-label {
		display: block;
		font-size: 0.75rem;
		color: var(--admin-text-muted);
		margin-bottom: 0.375rem;
		letter-spacing: 0.08em;
		text-transform: uppercase;
	}

	.stat-value {
		display: block;
		font-family: var(--font-serif);
		font-size: 1.75rem;
		font-weight: 400;
		color: var(--admin-heading);
		letter-spacing: 0.01em;
	}

	.stat-detail {
		display: block;
		font-size: 0.75rem;
		color: var(--admin-text-subtle);
		margin-top: 0.25rem;
		letter-spacing: 0.02em;
	}

	/* Panel */
	.panel {
		background: var(--admin-surface);
		border-radius: 3px;
		padding: 1.25rem 1.5rem;
		border: 1px solid var(--admin-border);
		margin-bottom: 1.5rem;
	}

	.panel h2 {
		font-family: var(--font-serif);
		font-size: 1.125rem;
		font-weight: 400;
		color: var(--admin-heading);
		margin: 0 0 1rem;
		letter-spacing: 0.01em;
	}

	.section-header {
		display: flex;
		justify-content: space-between;
		align-items: baseline;
		margin-bottom: 1rem;
	}

	.section-header h2 {
		margin: 0;
	}

	.view-all {
		color: var(--admin-accent);
		text-decoration: none;
		font-size: 0.8125rem;
		letter-spacing: 0.03em;
	}

	.view-all:hover {
		color: var(--admin-accent-hover);
	}

	/* Sparkline */
	.sparkline {
		display: flex;
		align-items: flex-end;
		gap: 2px;
		height: 72px;
	}

	.sparkline-bar-wrapper {
		flex: 1;
		height: 100%;
		display: flex;
		align-items: flex-end;
	}

	.sparkline-bar {
		width: 100%;
		background: var(--admin-accent);
		border-radius: 1px 1px 0 0;
		min-height: 2px;
		opacity: 0.55;
		transition: opacity 0.2s ease;
	}

	.sparkline-bar-wrapper:hover .sparkline-bar {
		opacity: 1;
	}

	.sparkline-labels {
		display: flex;
		justify-content: space-between;
		margin-top: 0.5rem;
		font-size: 0.7rem;
		color: var(--admin-text-subtle);
		letter-spacing: 0.04em;
	}

	/* Data Table */
	.table-wrapper {
		overflow-x: auto;
	}

	.data-table {
		width: 100%;
		border-collapse: collapse;
		font-size: 0.875rem;
	}

	.data-table th {
		text-align: left;
		padding: 0.625rem 0.75rem;
		color: var(--admin-text-subtle);
		font-weight: 500;
		font-size: 0.7rem;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		border-bottom: 1px solid var(--admin-border);
	}

	.data-table td {
		padding: 0.75rem;
		color: var(--admin-text);
		border-bottom: 1px solid var(--admin-border);
	}

	.data-table tr:last-child td {
		border-bottom: none;
	}

	.data-table td.muted {
		color: var(--admin-text-muted);
	}

	.data-table td.numeric {
		font-variant-numeric: tabular-nums;
	}

	.order-number {
		font-variant-numeric: tabular-nums;
		color: var(--admin-heading);
	}

	/* Status Badge */
	.status-badge {
		display: inline-block;
		padding: 0.2rem 0.625rem;
		border-radius: 2px;
		font-size: 0.7rem;
		font-weight: 500;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		border: 1px solid currentColor;
	}

	.status-badge[data-status="processing"] { color: var(--status-slate); }
	.status-badge[data-status="submitted"] { color: var(--status-amber); }
	.status-badge[data-status="printing"] { color: var(--status-lavender); }
	.status-badge[data-status="shipped"] { color: var(--status-peach); }
	.status-badge[data-status="delivered"] { color: var(--status-sage); }
	.status-badge[data-status="refunded"] { color: var(--status-rose); }
	.status-badge[data-status="fulfillment_error"] { color: var(--status-dusty-red); }
	.status-badge[data-status="cancelled"] { color: var(--status-gray); }

	/* Empty State */
	.empty-state {
		padding: 2rem;
		text-align: center;
		color: var(--admin-text-subtle);
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
