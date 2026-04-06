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
			<a href="/" class="action-link secondary">back to gallery</a>
		</div>
	</div>
</div>

<style>
	.success-page {
		min-height: 100vh;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 2rem;
	}

	.success-content {
		text-align: center;
		max-width: 480px;
	}

	.success-icon {
		font-size: 2.5rem;
		color: var(--ink);
		margin-bottom: 1.5rem;
		opacity: 0.6;
	}

	h1 {
		font-family: var(--font-serif);
		font-weight: 300;
		font-size: 2.5rem;
		color: var(--ink);
		letter-spacing: 0.15em;
		text-transform: lowercase;
		margin-bottom: 1.5rem;
	}

	.success-message {
		font-family: var(--font-serif);
		font-size: 1.1rem;
		color: rgba(var(--ink-rgb), 0.7);
		line-height: 1.6;
		margin-bottom: 1rem;
	}

	.success-detail {
		font-family: var(--font-serif);
		font-size: 0.95rem;
		color: rgba(var(--ink-rgb), 0.5);
		line-height: 1.5;
		margin-bottom: 1.5rem;
	}

	.order-ref {
		font-family: var(--font-serif);
		font-size: 0.8rem;
		color: rgba(var(--ink-rgb), 0.3);
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
		color: rgba(var(--ink-rgb), 0.6);
		background: transparent;
		border: 1px solid rgba(var(--ink-rgb), 0.2);
	}

	.action-link.secondary:hover {
		border-color: rgba(var(--ink-rgb), 0.4);
		color: var(--ink);
	}
</style>
