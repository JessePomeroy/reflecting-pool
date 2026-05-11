<script lang="ts">
import { page } from "$app/state";

const sessionId = $derived(page.url.searchParams.get("session_id"));
</script>

<svelte:head>
	<title>order confirmed · margaret helena</title>
</svelte:head>

<div class="success-page">
	<div class="success-content">
		<div class="success-icon">✦</div>
		<h1>thank you</h1>
		<p class="success-message">
			Your order has been placed. Your fine art print will be carefully produced and
			shipped directly to you.
		</p>
		<p class="success-detail">
			You'll receive a confirmation email shortly. Once your print ships, we'll send
			tracking information.
		</p>
		{#if sessionId}
			<p class="order-ref">Order reference: {sessionId.slice(0, 16)}…</p>
		{/if}
		<div class="success-actions">
			<a href="/shop" class="action-link">continue browsing</a>
			<a href="/" class="action-link secondary">home</a>
		</div>
	</div>
</div>

<style>
	.success-page {
		--shop-text: rgba(var(--paper-rgb), 0.9);
		--shop-body: rgba(var(--paper-rgb), 0.76);
		--shop-muted: rgba(var(--paper-rgb), 0.58);
		--shop-faint: rgba(var(--paper-rgb), 0.38);
		min-height: 100vh;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 2rem;
		text-shadow: 0 1px 14px rgba(var(--ink-rgb), 0.2);
	}

	.success-content {
		text-align: center;
		max-width: 480px;
	}

	.success-icon {
		font-size: 2.5rem;
		color: var(--shop-text);
		margin-bottom: 1.5rem;
		opacity: 0.6;
	}

	h1 {
		font-family: var(--font-serif);
		font-weight: 300;
		font-size: 2.5rem;
		color: var(--shop-text);
		letter-spacing: 0.15em;
		text-transform: lowercase;
		margin-bottom: 1.5rem;
	}

	.success-message {
		font-family: var(--font-serif);
		font-size: 1.1rem;
		color: var(--shop-body);
		line-height: 1.6;
		margin-bottom: 1rem;
	}

	.success-detail {
		font-family: var(--font-serif);
		font-size: 0.95rem;
		color: var(--shop-muted);
		line-height: 1.5;
		margin-bottom: 1.5rem;
	}

	.order-ref {
		font-family: var(--font-serif);
		font-size: 0.8rem;
		color: var(--shop-faint);
		letter-spacing: 0.05em;
		margin-bottom: 2rem;
	}

	.success-actions {
		display: flex;
		gap: 1rem;
		justify-content: center;
		flex-wrap: wrap;
	}

	.action-link {
		font-family: var(--font-serif);
		font-size: 1rem;
		letter-spacing: 0.08em;
		text-transform: lowercase;
		text-decoration: none;
		padding: 0.7rem 1.5rem;
		border-radius: 2px;
		transition: all 0.3s ease;
		color: #c8cfd8;
		background: var(--ink);
	}

	.action-link:hover {
		background: #2a3142;
	}

	.action-link.secondary {
		color: var(--shop-body);
		background: transparent;
		border: 1px solid var(--shop-faint);
	}

	.action-link.secondary:hover {
		border-color: var(--shop-muted);
		color: var(--shop-text);
	}
</style>
