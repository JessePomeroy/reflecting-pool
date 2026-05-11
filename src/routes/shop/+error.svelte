<script lang="ts">
// Audit H24: migrated from deprecated `$app/stores` to `$app/state`.
import { page } from "$app/state";
</script>

<div class="error-page">
	<h1>something went wrong</h1>
	<p>{page.status === 404 ? 'this print could not be found.' : 'please try again in a moment.'}</p>
	<a href="/shop">← back to shop</a>
</div>

<style>
	.error-page {
		--shop-text: rgba(var(--paper-rgb), 0.9);
		--shop-body: rgba(var(--paper-rgb), 0.76);
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		min-height: 60vh;
		font-family: var(--font-serif);
		color: var(--shop-text);
		text-align: center;
		gap: 1rem;
		text-shadow: 0 1px 14px rgba(var(--ink-rgb), 0.2);
	}

	h1 {
		font-weight: 300;
		font-size: 2rem;
	}

	p {
		color: var(--shop-body);
	}

	a {
		color: var(--shop-text);
		text-decoration: underline;
	}
</style>
