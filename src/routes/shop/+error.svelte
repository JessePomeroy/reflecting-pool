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
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		min-height: 60vh;
		font-family: var(--font-serif);
		color: var(--ink);
		text-align: center;
		gap: 1rem;
	}

	h1 {
		font-weight: 300;
		font-size: 2rem;
	}

	p {
		color: #6b7280;
	}

	a {
		color: var(--ink);
		text-decoration: underline;
	}
</style>
