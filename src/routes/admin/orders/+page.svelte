<script lang="ts">
import type { AdminOrder } from "$lib/admin/types";
import {
	DATE_FILTERS,
	formatCurrency,
	formatDate,
	formatDateTime,
	formatStatus,
	getStatusColor,
	ORDER_STATUSES,
} from "../utils";
import type { PageData } from "./$types";

let { data }: { data: PageData } = $props();

// Filter state (mirrors URL params, used for form submission)
// Initial values from server; intentionally captures initial data on mount
let statusFilter = $state(data.filters.status as string);
let searchQuery = $state(data.filters.search as string);
let dateFilter = $state(data.filters.date as string);

// Modal state
let selectedOrder = $state<AdminOrder | null>(null);
let modalNotes = $state("");
let savingNotes = $state(false);
let updatingStatus = $state(false);
let notesSaved = $state(false);

function openModal(orderId: string) {
	const order = data.fullOrders.find((o) => o._id === orderId) ?? null;
	selectedOrder = order;
	modalNotes = order?.internalNotes ?? "";
	notesSaved = false;
}

function closeModal() {
	selectedOrder = null;
}

async function saveNotes() {
	if (!selectedOrder) return;
	savingNotes = true;
	try {
		const res = await fetch(`/api/admin/orders/${selectedOrder._id}`, {
			method: "PATCH",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ internalNotes: modalNotes }),
		});
		if (res.ok) {
			notesSaved = true;
			selectedOrder = { ...selectedOrder, internalNotes: modalNotes };
		}
	} finally {
		savingNotes = false;
	}
}

async function updateStatus(orderId: string, newStatus: string) {
	updatingStatus = true;
	try {
		const res = await fetch(`/api/admin/orders/${orderId}`, {
			method: "PATCH",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ status: newStatus }),
		});
		if (res.ok && selectedOrder && selectedOrder._id === orderId) {
			selectedOrder = { ...selectedOrder, status: newStatus as AdminOrder["status"] };
		}
	} finally {
		updatingStatus = false;
	}
}

function exportCSV() {
	const headers = [
		"Order #",
		"Date",
		"Customer Name",
		"Email",
		"Items",
		"Subtotal",
		"Stripe Fee",
		"Gross Revenue",
		"Net Revenue",
		"Status",
	];

	const rows = data.fullOrders.map((o) => [
		o.orderNumber,
		formatDate(o.date),
		o.customerName,
		o.customerEmail,
		o.items.length,
		o.subtotal.toFixed(2),
		o.stripeFee.toFixed(2),
		o.total.toFixed(2),
		o.netRevenue.toFixed(2),
		o.status,
	]);

	const csv = [headers, ...rows].map((row) => row.join(",")).join("\n");
	const blob = new Blob([csv], { type: "text/csv" });
	const url = URL.createObjectURL(blob);
	const a = document.createElement("a");
	a.href = url;
	a.download = `orders-${new Date().toISOString().split("T")[0]}.csv`;
	a.click();
	URL.revokeObjectURL(url);
}

function handleKeydown(e: KeyboardEvent) {
	if (e.key === "Escape" && selectedOrder) closeModal();
}
</script>

<svelte:window onkeydown={handleKeydown} />

<svelte:head>
	<title>Orders · Admin</title>
</svelte:head>

<div class="orders-page">
	<header class="page-header">
		<div>
			<h1>Orders</h1>
			<p class="subtitle">{data.summary.totalOrders} order{data.summary.totalOrders !== 1 ? "s" : ""} found</p>
		</div>
		<button class="btn-export" onclick={exportCSV}>↓ Export CSV</button>
	</header>

	<!-- Revenue Summary -->
	<div class="revenue-summary">
		<div class="rev-card">
			<span class="rev-label">Gross Revenue</span>
			<span class="rev-value">{formatCurrency(data.summary.totalRevenue)}</span>
		</div>
		<div class="rev-card">
			<span class="rev-label">Stripe Fees</span>
			<span class="rev-value fee">{formatCurrency(data.summary.stripeFees)}</span>
		</div>
		<div class="rev-card highlight">
			<span class="rev-label">Net Revenue</span>
			<span class="rev-value">{formatCurrency(data.summary.netRevenue)}</span>
		</div>
	</div>

	<!-- Filters -->
	<form method="GET" class="filters">
		<input
			type="text"
			name="search"
			class="filter-input"
			placeholder="Search name, email, order #"
			value={searchQuery}
			oninput={(e) => (searchQuery = (e.target as HTMLInputElement).value)}
		/>
		<select name="status" class="filter-select" bind:value={statusFilter}>
			<option value="">All Statuses</option>
			{#each ORDER_STATUSES as s (s.value)}
				<option value={s.value}>{s.label}</option>
			{/each}
		</select>
		<select name="date" class="filter-select" bind:value={dateFilter}>
			{#each DATE_FILTERS as f (f.value)}
				<option value={f.value}>{f.label}</option>
			{/each}
		</select>
		<button type="submit" class="btn-filter">Filter</button>
		<a href="/admin/orders" class="btn-reset">Reset</a>
	</form>

	<!-- Orders Table -->
	<div class="table-wrapper">
		{#if data.orders.length === 0}
			<div class="empty-state">
				<p>No orders match your filters.</p>
				<a href="/admin/orders" class="btn-reset">Clear filters</a>
			</div>
		{:else}
			<table class="orders-table">
				<thead>
					<tr>
						<th>Order #</th>
						<th>Date</th>
						<th>Customer</th>
						<th>Email</th>
						<th>Items</th>
						<th>Total</th>
						<th>Status</th>
						<th>Actions</th>
					</tr>
				</thead>
				<tbody>
					{#each data.orders as order (order._id)}
						<tr class="order-row" onclick={() => openModal(order._id)}>
							<td class="col-order-number">{order.orderNumber}</td>
							<td class="col-date">{formatDate(order.date)}</td>
							<td class="col-name">{order.customerName}</td>
							<td class="col-email">{order.customerEmail}</td>
							<td class="col-items">{order.itemCount}</td>
							<td class="col-total">{formatCurrency(order.total)}</td>
							<td>
								<span class="status-badge" data-status={order.status}>
									{formatStatus(order.status)}
								</span>
							</td>
							<td>
								<button
									class="btn-view"
									onclick={(e) => { e.stopPropagation(); openModal(order._id); }}
								>
									View
								</button>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		{/if}
	</div>
</div>

<!-- Order Detail Modal -->
{#if selectedOrder}
	<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
	<div class="modal-backdrop" onclick={closeModal} role="dialog" aria-modal="true" aria-label="Order detail" tabindex="-1">
		<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
		<div class="modal" onclick={(e) => e.stopPropagation()}>
			<div class="modal-header">
				<div>
					<h2>{selectedOrder.orderNumber}</h2>
					<p class="modal-date">{formatDateTime(selectedOrder.createdAt)}</p>
				</div>
				<button class="modal-close" onclick={closeModal} aria-label="Close">
					<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>
				</button>
			</div>

			<div class="modal-body">
				<!-- Customer Info -->
				<section class="modal-section">
					<h3>Customer</h3>
					<div class="info-grid">
						<span class="info-label">Name</span>
						<span>{selectedOrder.customerName}</span>
						<span class="info-label">Email</span>
						<a href="mailto:{selectedOrder.customerEmail}" class="info-link">{selectedOrder.customerEmail}</a>
					</div>
				</section>

				<!-- Shipping Address -->
				<section class="modal-section">
					<h3>Shipping Address</h3>
					<address class="address">
						{selectedOrder.shippingAddress.line1}<br />
						{#if selectedOrder.shippingAddress.line2}{selectedOrder.shippingAddress.line2}<br />{/if}
						{selectedOrder.shippingAddress.city}, {selectedOrder.shippingAddress.state} {selectedOrder.shippingAddress.postalCode}<br />
						{selectedOrder.shippingAddress.country}
					</address>
				</section>

				<!-- Items -->
				<section class="modal-section">
					<h3>Items</h3>
					<div class="items-list">
						{#each selectedOrder.items as item (item.id)}
							<div class="item-row">
								<div class="item-info">
									<span class="item-title">{item.title}</span>
									<span class="item-meta">{item.paperSize} · {item.paperType} · qty {item.quantity}</span>
								</div>
								<span class="item-price">{formatCurrency(item.price * item.quantity)}</span>
							</div>
						{/each}
						<div class="item-total">
							<span>Total</span>
							<span>{formatCurrency(selectedOrder.total)}</span>
						</div>
					</div>
				</section>

				<!-- Status Control -->
				<section class="modal-section">
					<h3>Status</h3>
					<div class="status-control">
						<span class="status-badge" data-status={selectedOrder.status}>
							{formatStatus(selectedOrder.status)}
						</span>
						<select
							class="filter-select"
							disabled={updatingStatus}
							onchange={(e) => updateStatus(selectedOrder!._id, (e.target as HTMLSelectElement).value)}
						>
							{#each ORDER_STATUSES as s (s.value)}
								<option value={s.value} selected={s.value === selectedOrder.status}>{s.label}</option>
							{/each}
						</select>
					</div>
				</section>

				<!-- Fulfillment Info -->
				{#if selectedOrder.lumaprintsOrderNumber || selectedOrder.trackingNumber}
					<section class="modal-section">
						<h3>Fulfillment</h3>
						<div class="info-grid">
							{#if selectedOrder.lumaprintsOrderNumber}
								<span class="info-label">LumaPrints #</span>
								<span>{selectedOrder.lumaprintsOrderNumber}</span>
							{/if}
							{#if selectedOrder.trackingNumber}
								<span class="info-label">Tracking</span>
								{#if selectedOrder.trackingUrl}
									<a href={selectedOrder.trackingUrl} target="_blank" rel="noreferrer" class="info-link">
										{selectedOrder.trackingNumber} ({selectedOrder.shippingCarrier})
									</a>
								{:else}
									<span>{selectedOrder.trackingNumber}</span>
								{/if}
							{/if}
							{#if selectedOrder.shippedAt}
								<span class="info-label">Shipped</span>
								<span>{formatDate(selectedOrder.shippedAt)}</span>
							{/if}
						</div>
					</section>
				{/if}

				<!-- Internal Notes -->
				<section class="modal-section">
					<h3>Internal Notes</h3>
					<textarea
						class="notes-textarea"
						placeholder="Add private notes about this order..."
						bind:value={modalNotes}
						rows={4}
					></textarea>
					<div class="notes-actions">
						{#if notesSaved}
							<span class="notes-saved">
								<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12l5 5L20 7"/></svg>
								Saved
							</span>
						{/if}
						<button
							class="btn-save"
							onclick={saveNotes}
							disabled={savingNotes}
						>
							{savingNotes ? "Saving..." : "Save Notes"}
						</button>
					</div>
				</section>
			</div>
		</div>
	</div>
{/if}

<style>
	.orders-page {
		max-width: 1400px;
	}

	.page-header {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		margin-bottom: 1.5rem;
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

	/* Revenue Summary */
	.revenue-summary {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 1rem;
		margin-bottom: 1.5rem;
	}

	.rev-card {
		background: var(--admin-surface);
		border: 1px solid var(--admin-border-strong);
		border-radius: 0.5rem;
		padding: 1rem 1.25rem;
	}

	.rev-card.highlight {
		background: linear-gradient(135deg, var(--admin-surface-raised) 0%, var(--admin-surface-raised) 100%);
		border-color: var(--admin-accent);
	}

	.rev-label {
		display: block;
		font-size: 0.8125rem;
		color: var(--admin-text-muted);
		margin-bottom: 0.25rem;
	}

	.rev-value {
		display: block;
		font-size: 1.375rem;
		font-weight: 600;
		color: var(--admin-heading);
	}

	.rev-value.fee {
		color: #f87171;
	}

	/* Filters */
	.filters {
		display: flex;
		gap: 0.75rem;
		margin-bottom: 1.25rem;
		flex-wrap: wrap;
	}

	.filter-input {
		flex: 1;
		min-width: 200px;
		padding: 0.5rem 0.75rem;
		background: var(--admin-surface);
		border: 1px solid var(--admin-border-strong);
		border-radius: 0.375rem;
		color: var(--admin-heading);
		font-size: 0.875rem;
	}

	.filter-input::placeholder {
		color: var(--admin-text-subtle);
	}

	.filter-select {
		padding: 0.5rem 0.75rem;
		background: var(--admin-surface);
		border: 1px solid var(--admin-border-strong);
		border-radius: 0.375rem;
		color: var(--admin-heading);
		font-size: 0.875rem;
		cursor: pointer;
	}

	.btn-filter {
		padding: 0.5rem 1.25rem;
		background: var(--admin-accent);
		color: white;
		border: none;
		border-radius: 0.375rem;
		font-size: 0.875rem;
		font-weight: 500;
		cursor: pointer;
	}

	.btn-filter:hover {
		background: #059669;
	}

	.btn-reset {
		padding: 0.5rem 1rem;
		background: transparent;
		color: var(--admin-text-muted);
		border: 1px solid var(--admin-border-strong);
		border-radius: 0.375rem;
		font-size: 0.875rem;
		cursor: pointer;
		text-decoration: none;
	}

	.btn-reset:hover {
		background: var(--admin-border-strong);
		color: var(--admin-heading);
	}

	.btn-export {
		padding: 0.5rem 1.25rem;
		background: var(--admin-surface);
		color: var(--admin-text);
		border: 1px solid var(--admin-border-strong);
		border-radius: 0.375rem;
		font-size: 0.875rem;
		font-weight: 500;
		cursor: pointer;
	}

	.btn-export:hover {
		background: var(--admin-border-strong);
	}

	/* Table */
	.table-wrapper {
		background: var(--admin-surface);
		border: 1px solid var(--admin-border-strong);
		border-radius: 0.5rem;
		overflow: auto;
	}

	.orders-table {
		width: 100%;
		border-collapse: collapse;
		font-size: 0.875rem;
		white-space: nowrap;
	}

	.orders-table th {
		text-align: left;
		padding: 0.75rem 1rem;
		color: var(--admin-text-subtle);
		font-weight: 500;
		border-bottom: 1px solid var(--admin-border-strong);
		background: var(--admin-bg);
		position: sticky;
		top: 0;
	}

	.orders-table td {
		padding: 0.75rem 1rem;
		color: var(--admin-text);
		border-bottom: 1px solid var(--admin-surface);
	}

	.order-row {
		cursor: pointer;
		transition: background 0.1s ease;
	}

	.order-row:hover td {
		background: var(--admin-border-strong);
	}

	.order-row:last-child td {
		border-bottom: none;
	}

	.col-order-number {
		font-weight: 500;
		color: var(--admin-accent);
	}

	.col-date,
	.col-email {
		color: var(--admin-text-muted);
		font-size: 0.8125rem;
	}

	.col-total {
		font-weight: 500;
	}

	.btn-view {
		padding: 0.25rem 0.625rem;
		background: transparent;
		border: 1px solid var(--admin-border-strong);
		border-radius: 0.25rem;
		color: var(--admin-text-muted);
		font-size: 0.75rem;
		cursor: pointer;
	}

	.btn-view:hover {
		background: var(--admin-border-strong);
		color: var(--admin-heading);
	}

	/* Status Badges — muted outline style */
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
	.status-badge[data-status="new"] { color: var(--status-rose); }
	.status-badge[data-status="read"] { color: var(--status-amber); }
	.status-badge[data-status="replied"] { color: var(--status-sage); }

	/* Empty State */
	.empty-state {
		padding: 3rem;
		text-align: center;
		color: var(--admin-text-subtle);
	}

	/* Modal */
	.modal-backdrop {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.7);
		z-index: 200;
		display: flex;
		align-items: flex-start;
		justify-content: center;
		padding: 2rem 1rem;
		overflow-y: auto;
	}

	.modal {
		background: var(--admin-surface);
		border: 1px solid var(--admin-border-strong);
		border-radius: 0.75rem;
		width: 100%;
		max-width: 640px;
		box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
	}

	.modal-header {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		padding: 1.5rem;
		border-bottom: 1px solid var(--admin-border-strong);
	}

	.modal-header h2 {
		font-family: var(--font-serif);
		font-size: 1.5rem;
		font-weight: 400;
		letter-spacing: 0.01em;
		color: var(--admin-heading);
		margin: 0;
	}

	.modal-date {
		color: var(--admin-text-muted);
		font-size: 0.8125rem;
		margin-top: 0.25rem;
	}

	.modal-close {
		background: transparent;
		border: none;
		color: var(--admin-text-muted);
		cursor: pointer;
		padding: 0.375rem;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		border-radius: 2px;
		transition: color 0.15s ease, background 0.15s ease;
	}

	.modal-close:hover {
		color: var(--admin-heading);
		background: var(--admin-border);
	}

	.modal-body {
		padding: 0 1.5rem 1.5rem;
	}

	.modal-section {
		padding: 1.25rem 0;
		border-bottom: 1px solid var(--admin-border-strong);
	}

	.modal-section:last-child {
		border-bottom: none;
	}

	.modal-section h3 {
		font-size: 0.75rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--admin-text-subtle);
		margin-bottom: 0.75rem;
	}

	.info-grid {
		display: grid;
		grid-template-columns: 120px 1fr;
		gap: 0.5rem 1rem;
		font-size: 0.875rem;
	}

	.info-label {
		color: var(--admin-text-muted);
	}

	.info-link {
		color: var(--admin-accent);
		text-decoration: none;
	}

	.info-link:hover {
		text-decoration: underline;
	}

	.address {
		font-style: normal;
		font-size: 0.875rem;
		color: var(--admin-text);
		line-height: 1.6;
	}

	.items-list {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.item-row {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		padding: 0.5rem 0;
		font-size: 0.875rem;
	}

	.item-info {
		display: flex;
		flex-direction: column;
		gap: 0.125rem;
	}

	.item-title {
		color: var(--admin-heading);
		font-weight: 500;
	}

	.item-meta {
		color: var(--admin-text-muted);
		font-size: 0.8125rem;
	}

	.item-price {
		color: var(--admin-heading);
		font-weight: 500;
	}

	.item-total {
		display: flex;
		justify-content: space-between;
		padding: 0.75rem 0 0;
		border-top: 1px solid var(--admin-border-strong);
		font-weight: 600;
		color: var(--admin-heading);
		font-size: 0.9375rem;
	}

	.status-control {
		display: flex;
		align-items: center;
		gap: 1rem;
	}

	.notes-textarea {
		width: 100%;
		background: var(--admin-bg);
		border: 1px solid var(--admin-border-strong);
		border-radius: 0.375rem;
		color: var(--admin-text);
		font-size: 0.875rem;
		padding: 0.75rem;
		resize: vertical;
		font-family: inherit;
		box-sizing: border-box;
	}

	.notes-textarea:focus {
		outline: none;
		border-color: var(--admin-accent);
	}

	.notes-actions {
		display: flex;
		align-items: center;
		justify-content: flex-end;
		gap: 0.75rem;
		margin-top: 0.75rem;
	}

	.notes-saved {
		display: inline-flex;
		align-items: center;
		gap: 0.375rem;
		color: var(--status-sage);
		font-size: 0.8125rem;
	}

	.btn-save {
		padding: 0.5rem 1.25rem;
		background: var(--admin-accent);
		color: white;
		border: none;
		border-radius: 0.375rem;
		font-size: 0.875rem;
		font-weight: 500;
		cursor: pointer;
	}

	.btn-save:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.btn-save:not(:disabled):hover {
		background: #059669;
	}

	/* Responsive */
	@media (max-width: 768px) {
		.page-header {
			flex-direction: column;
			gap: 1rem;
		}

		.revenue-summary {
			grid-template-columns: 1fr;
		}

		.modal-backdrop {
			padding: 1rem 0;
			align-items: flex-end;
		}

		.modal {
			border-radius: 0.75rem 0.75rem 0 0;
			max-width: 100%;
		}
	}
</style>
