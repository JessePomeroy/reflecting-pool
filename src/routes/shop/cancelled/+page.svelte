<svelte:head>
	<title>checkout cancelled · margaret helena</title>
</svelte:head>

<div class="cancelled-page">
	<div class="cancelled-content">
		<h1>checkout cancelled</h1>
		<p class="cancelled-message">
			No worries — your cart hasn't been charged. Your print will be here when you're
			ready.
		</p>
		<div class="cancelled-actions">
			<a href="/shop" class="action-link">back to shop</a>
			<a href="/" class="action-link secondary">gallery</a>
		</div>
	</div>
</div>

<style>
	.cancelled-page {
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

	.cancelled-content {
		text-align: center;
		max-width: 420px;
	}

	h1 {
		font-family: var(--font-serif);
		font-weight: 300;
		font-size: 2rem;
		color: var(--shop-text);
		letter-spacing: 0.12em;
		text-transform: lowercase;
		margin-bottom: 1rem;
	}

	.cancelled-message {
		font-family: var(--font-serif);
		font-size: 1.05rem;
		color: var(--shop-body);
		line-height: 1.6;
		margin-bottom: 2rem;
	}

	.cancelled-actions {
		display: flex;
		gap: 1rem;
		justify-content: center;
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
