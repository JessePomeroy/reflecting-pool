<script lang="ts">
import type { Inquiry } from "$lib/admin/types";
import { formatDateTime } from "../utils";
import type { PageData } from "./$types";

let { data }: { data: PageData } = $props();

let selectedInquiry = $state<Inquiry | null>(null);
let updatingStatus = $state(false);

// Local mutable copy for optimistic updates (intentionally captures initial data on mount)
let inquiries = $state([...(data.inquiries as Inquiry[])]);

function openInquiry(inquiry: Inquiry) {
	selectedInquiry = { ...inquiry };
	// Mark as read if new
	if (inquiry.status === "new") {
		markStatus(inquiry._id, "read");
	}
}

function closeModal() {
	selectedInquiry = null;
}

async function markStatus(id: string, status: "read" | "replied") {
	updatingStatus = true;
	try {
		const res = await fetch(`/api/admin/inquiries/${id}`, {
			method: "PATCH",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ status }),
		});
		if (res.ok) {
			inquiries = inquiries.map((inq) => (inq._id === id ? { ...inq, status } : inq));
			if (selectedInquiry && selectedInquiry._id === id) {
				selectedInquiry = { ...selectedInquiry, status };
			}
		}
	} finally {
		updatingStatus = false;
	}
}

function formatStatus(status: string): string {
	const labels: Record<string, string> = {
		new: "New",
		read: "Read",
		replied: "Replied",
	};
	return labels[status] || status;
}

function handleKeydown(e: KeyboardEvent) {
	if (e.key === "Escape" && selectedInquiry) closeModal();
}

const newCount = $derived(inquiries.filter((i) => i.status === "new").length);
</script>

<svelte:window onkeydown={handleKeydown} />

<svelte:head>
	<title>Inquiries · Admin</title>
</svelte:head>

<div class="inquiries-page">
	<header class="page-header">
		<div>
			<h1>Inquiries</h1>
			<p class="subtitle">
				{inquiries.length} total
				{#if newCount > 0}
					· <span class="new-badge">{newCount} new</span>
				{/if}
			</p>
		</div>
	</header>

	<div class="table-wrapper">
		{#if inquiries.length === 0}
			<div class="empty-state">
				<p>No inquiries yet.</p>
			</div>
		{:else}
			<table class="inquiries-table">
				<thead>
					<tr>
						<th>Date</th>
						<th>Name</th>
						<th>Email</th>
						<th>Subject</th>
						<th>Preview</th>
						<th>Status</th>
						<th></th>
					</tr>
				</thead>
				<tbody>
					{#each inquiries as inquiry (inquiry._id)}
						<tr
							class="inquiry-row"
							class:is-new={inquiry.status === "new"}
							onclick={() => openInquiry(inquiry)}
						>
							<td class="col-date">{formatDateTime(inquiry.submittedAt)}</td>
							<td class="col-name">{inquiry.name}</td>
							<td class="col-email">{inquiry.email}</td>
							<td class="col-subject">{inquiry.subject}</td>
							<td class="col-preview">{inquiry.message.slice(0, 80)}{inquiry.message.length > 80 ? "…" : ""}</td>
							<td>
								<span class="status-badge" data-status={inquiry.status}>
									{formatStatus(inquiry.status)}
								</span>
							</td>
							<td>
								<button
									class="btn-view"
									onclick={(e) => { e.stopPropagation(); openInquiry(inquiry); }}
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

<!-- Inquiry Detail Modal -->
{#if selectedInquiry}
	<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
	<div
		class="modal-backdrop"
		onclick={closeModal}
		role="dialog"
		aria-modal="true"
		aria-label="Inquiry detail"
		tabindex="-1"
	>
		<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
		<div class="modal" onclick={(e) => e.stopPropagation()}>
			<div class="modal-header">
				<div>
					<h2>{selectedInquiry.subject}</h2>
					<p class="modal-meta">
						{selectedInquiry.name} · {selectedInquiry.email}
						{#if selectedInquiry.phone} · {selectedInquiry.phone}{/if}
					</p>
					<p class="modal-date">{formatDateTime(selectedInquiry.submittedAt)}</p>
				</div>
				<button class="modal-close" onclick={closeModal} aria-label="Close">
					<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>
				</button>
			</div>

			<div class="modal-body">
				<section class="message-section">
					<h3>Message</h3>
					<p class="message-text">{selectedInquiry.message}</p>
				</section>

				<section class="actions-section">
					<h3>Status</h3>
					<div class="status-row">
						<span class="status-badge" data-status={selectedInquiry.status}>
							{formatStatus(selectedInquiry.status)}
						</span>
						<div class="action-btns">
							<button
								class="btn-action"
								class:active={selectedInquiry.status === "read"}
								disabled={updatingStatus || selectedInquiry.status === "read"}
								onclick={() => markStatus(selectedInquiry!._id, "read")}
							>
								Mark Read
							</button>
							<button
								class="btn-action btn-replied"
								class:active={selectedInquiry.status === "replied"}
								disabled={updatingStatus || selectedInquiry.status === "replied"}
								onclick={() => markStatus(selectedInquiry!._id, "replied")}
							>
								Mark Replied
							</button>
							<a
								href="mailto:{selectedInquiry.email}?subject=Re: {encodeURIComponent(selectedInquiry.subject)}"
								class="btn-email"
							>
								Reply via Email ↗
							</a>
						</div>
					</div>
				</section>
			</div>
		</div>
	</div>
{/if}

<style>
	.inquiries-page {
		max-width: 1200px;
	}

	.page-header {
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

	.new-badge {
		color: #f87171;
		font-weight: 600;
	}

	/* Table */
	.table-wrapper {
		background: var(--admin-surface);
		border: 1px solid var(--admin-border-strong);
		border-radius: 0.5rem;
		overflow: auto;
	}

	.inquiries-table {
		width: 100%;
		border-collapse: collapse;
		font-size: 0.875rem;
	}

	.inquiries-table th {
		text-align: left;
		padding: 0.75rem 1rem;
		color: var(--admin-text-subtle);
		font-weight: 500;
		border-bottom: 1px solid var(--admin-border-strong);
		background: var(--admin-bg);
		position: sticky;
		top: 0;
		white-space: nowrap;
	}

	.inquiries-table td {
		padding: 0.75rem 1rem;
		color: var(--admin-text);
		border-bottom: 1px solid var(--admin-surface);
		vertical-align: top;
	}

	.inquiry-row {
		cursor: pointer;
		transition: background 0.1s ease;
	}

	.inquiry-row:hover td {
		background: var(--admin-border-strong);
	}

	.inquiry-row:last-child td {
		border-bottom: none;
	}

	.inquiry-row.is-new td {
		background: rgba(239, 68, 68, 0.05);
	}

	.inquiry-row.is-new:hover td {
		background: var(--admin-border-strong);
	}

	.col-date {
		color: var(--admin-text-muted);
		font-size: 0.8125rem;
		white-space: nowrap;
	}

	.col-name {
		font-weight: 500;
		white-space: nowrap;
	}

	.col-email {
		color: var(--admin-text-muted);
		font-size: 0.8125rem;
		white-space: nowrap;
	}

	.col-subject {
		font-weight: 500;
		max-width: 180px;
	}

	.col-preview {
		color: var(--admin-text-muted);
		font-size: 0.8125rem;
		max-width: 260px;
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

	.status-badge[data-status="new"] { color: var(--status-rose); }
	.status-badge[data-status="read"] { color: var(--status-amber); }
	.status-badge[data-status="replied"] { color: var(--status-sage); }

	/* Empty */
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
		max-width: 600px;
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
		font-size: 1.375rem;
		font-weight: 400;
		letter-spacing: 0.01em;
		color: var(--admin-heading);
		margin: 0 0 0.25rem;
	}

	.modal-meta {
		color: var(--admin-text-muted);
		font-size: 0.875rem;
	}

	.modal-date {
		color: var(--admin-text-subtle);
		font-size: 0.8125rem;
		margin-top: 0.125rem;
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
		flex-shrink: 0;
		transition: color 0.15s ease, background 0.15s ease;
	}

	.modal-close:hover {
		color: var(--admin-heading);
		background: var(--admin-border);
	}

	.modal-body {
		padding: 0 1.5rem 1.5rem;
	}

	.message-section,
	.actions-section {
		padding: 1.25rem 0;
		border-bottom: 1px solid var(--admin-border-strong);
	}

	.actions-section {
		border-bottom: none;
	}

	.message-section h3,
	.actions-section h3 {
		font-size: 0.75rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--admin-text-subtle);
		margin-bottom: 0.75rem;
	}

	.message-text {
		font-size: 0.9375rem;
		color: var(--admin-text);
		line-height: 1.7;
		white-space: pre-wrap;
	}

	.status-row {
		display: flex;
		align-items: center;
		gap: 1rem;
		flex-wrap: wrap;
	}

	.action-btns {
		display: flex;
		gap: 0.75rem;
		flex-wrap: wrap;
	}

	.btn-action {
		padding: 0.5rem 1rem;
		background: transparent;
		border: 1px solid var(--admin-border-strong);
		border-radius: 0.375rem;
		color: var(--admin-text-muted);
		font-size: 0.875rem;
		cursor: pointer;
	}

	.btn-action:not(:disabled):hover {
		background: var(--admin-border-strong);
		color: var(--admin-heading);
	}

	.btn-action.active,
	.btn-action:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.btn-replied {
		border-color: var(--admin-accent);
		color: var(--admin-accent);
	}

	.btn-replied:not(:disabled):hover {
		background: var(--admin-accent);
		color: white;
	}

	.btn-email {
		padding: 0.5rem 1rem;
		background: #1d4ed8;
		color: white;
		border: none;
		border-radius: 0.375rem;
		font-size: 0.875rem;
		text-decoration: none;
		cursor: pointer;
	}

	.btn-email:hover {
		background: #1e40af;
	}

	@media (max-width: 768px) {
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
