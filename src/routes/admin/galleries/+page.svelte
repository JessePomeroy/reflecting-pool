<script lang="ts">
import type { PageData } from "./$types";

let { data }: { data: PageData } = $props();
</script>

<svelte:head>
	<title>Galleries · Admin</title>
</svelte:head>

<div class="galleries-page">
	<header class="page-header">
		<div>
			<h1>Galleries</h1>
			<p class="subtitle">Overview of collections. Edit content in Sanity Studio.</p>
		</div>
		<a
			href="https://reflecting-pool.sanity.studio"
			target="_blank"
			rel="noreferrer"
			class="btn-studio"
		>
			Open Sanity Studio ↗
		</a>
	</header>

	<div class="notice">
		<span class="notice-icon">ℹ️</span>
		<p>
			To add or edit photos, captions, and collections — use <strong>Sanity Studio</strong>.
			This page shows a quick overview of your current galleries.
		</p>
	</div>

	<div class="galleries-grid">
		{#each data.galleries as gallery (gallery._id)}
			<div class="gallery-card">
				<div class="gallery-card-header">
					<div>
						<h2 class="gallery-title">{gallery.title}</h2>
						<p class="gallery-slug">/{gallery.slug}</p>
					</div>
					<span class="visibility-badge" class:visible={gallery.isVisible}>
						{gallery.isVisible ? "Visible" : "Hidden"}
					</span>
				</div>

				<div class="gallery-stats">
					<div class="stat">
						<span class="stat-value">{gallery.imageCount}</span>
						<span class="stat-label">Images</span>
					</div>
					<div class="stat">
						<span class="stat-value print-count">{gallery.printAvailableCount}</span>
						<span class="stat-label">Available as Prints</span>
					</div>
					<div class="stat">
						<span class="stat-value print-pct">
							{gallery.imageCount > 0
								? Math.round((gallery.printAvailableCount / gallery.imageCount) * 100)
								: 0}%
						</span>
						<span class="stat-label">Print Coverage</span>
					</div>
				</div>

				<div class="gallery-card-footer">
					<a
						href="/shop/collection/{gallery.slug}"
						target="_blank"
						rel="noreferrer"
						class="btn-link"
					>
						View on Site ↗
					</a>
					<a
						href="https://reflecting-pool.sanity.studio/desk/gallery;{gallery._id}"
						target="_blank"
						rel="noreferrer"
						class="btn-edit"
					>
						Edit in Studio ↗
					</a>
				</div>
			</div>
		{/each}
	</div>

	<!-- Print availability summary -->
	<div class="summary-card">
		<h2>Print Shop Summary</h2>
		<div class="summary-stats">
			<div class="summary-stat">
				<span class="stat-value">{data.galleries.length}</span>
				<span class="stat-label">Collections</span>
			</div>
			<div class="summary-stat">
				<span class="stat-value">{data.galleries.reduce((s, g) => s + g.imageCount, 0)}</span>
				<span class="stat-label">Total Photos</span>
			</div>
			<div class="summary-stat">
				<span class="stat-value print-count">{data.galleries.reduce((s, g) => s + g.printAvailableCount, 0)}</span>
				<span class="stat-label">Available as Prints</span>
			</div>
			<div class="summary-stat">
				<span class="stat-value">{data.galleries.filter((g) => g.isVisible).length}</span>
				<span class="stat-label">Visible Collections</span>
			</div>
		</div>
	</div>
</div>

<style>
	.galleries-page {
		max-width: 1000px;
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

	.btn-studio {
		padding: 0.5rem 1.25rem;
		background: #7c3aed;
		color: white;
		text-decoration: none;
		border-radius: 0.375rem;
		font-size: 0.875rem;
		font-weight: 500;
		white-space: nowrap;
	}

	.btn-studio:hover {
		background: #6d28d9;
	}

	/* Notice */
	.notice {
		display: flex;
		gap: 0.75rem;
		background: rgba(59, 130, 246, 0.1);
		border: 1px solid rgba(59, 130, 246, 0.3);
		border-radius: 0.5rem;
		padding: 1rem 1.25rem;
		margin-bottom: 1.5rem;
		align-items: flex-start;
	}

	.notice-icon {
		font-size: 1.125rem;
		flex-shrink: 0;
	}

	.notice p {
		font-size: 0.875rem;
		color: #93c5fd;
		line-height: 1.5;
		margin: 0;
	}

	.notice strong {
		color: #bfdbfe;
	}

	/* Gallery Grid */
	.galleries-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
		gap: 1rem;
		margin-bottom: 1.5rem;
	}

	.gallery-card {
		background: var(--admin-surface);
		border: 1px solid var(--admin-border-strong);
		border-radius: 0.5rem;
		padding: 1.25rem;
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.gallery-card-header {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
	}

	.gallery-title {
		font-size: 1rem;
		font-weight: 600;
		color: var(--admin-heading);
		margin-bottom: 0.125rem;
	}

	.gallery-slug {
		font-size: 0.8125rem;
		color: var(--admin-text-subtle);
		font-family: monospace;
	}

	.visibility-badge {
		font-size: 0.75rem;
		padding: 0.2rem 0.6rem;
		border-radius: 9999px;
		font-weight: 500;
		background: var(--admin-border-strong);
		color: var(--admin-text-subtle);
	}

	.visibility-badge.visible {
		background: rgba(16, 185, 129, 0.15);
		color: var(--admin-accent);
	}

	.gallery-stats {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 0.75rem;
		border-top: 1px solid var(--admin-border-strong);
		padding-top: 1rem;
	}

	.stat {
		display: flex;
		flex-direction: column;
		gap: 0.125rem;
	}

	.stat-value {
		font-size: 1.25rem;
		font-weight: 600;
		color: var(--admin-heading);
	}

	.stat-value.print-count {
		color: var(--admin-accent);
	}

	.stat-value.print-pct {
		color: #60a5fa;
	}

	.stat-label {
		font-size: 0.75rem;
		color: var(--admin-text-subtle);
	}

	.gallery-card-footer {
		display: flex;
		gap: 0.75rem;
		border-top: 1px solid var(--admin-border-strong);
		padding-top: 1rem;
	}

	.btn-link {
		flex: 1;
		text-align: center;
		padding: 0.4rem 0.75rem;
		background: transparent;
		border: 1px solid var(--admin-border-strong);
		border-radius: 0.375rem;
		color: var(--admin-text-muted);
		font-size: 0.8125rem;
		text-decoration: none;
	}

	.btn-link:hover {
		background: var(--admin-border-strong);
		color: var(--admin-heading);
	}

	.btn-edit {
		flex: 1;
		text-align: center;
		padding: 0.4rem 0.75rem;
		background: rgba(124, 58, 237, 0.15);
		border: 1px solid rgba(124, 58, 237, 0.3);
		border-radius: 0.375rem;
		color: #a78bfa;
		font-size: 0.8125rem;
		text-decoration: none;
	}

	.btn-edit:hover {
		background: rgba(124, 58, 237, 0.3);
	}

	/* Summary Card */
	.summary-card {
		background: var(--admin-surface);
		border: 1px solid var(--admin-border-strong);
		border-radius: 0.5rem;
		padding: 1.25rem;
	}

	.summary-card h2 {
		font-size: 0.875rem;
		font-weight: 500;
		color: var(--admin-text-muted);
		margin-bottom: 1rem;
	}

	.summary-stats {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: 1rem;
	}

	.summary-stat {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	@media (max-width: 768px) {
		.page-header {
			flex-direction: column;
			gap: 1rem;
		}

		.summary-stats {
			grid-template-columns: repeat(2, 1fr);
		}
	}
</style>
