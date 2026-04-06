<script lang="ts">
import { page } from "$app/stores";
</script>

<div class="error-page">
	<h1>Something went wrong</h1>
	<p>{$page.status === 404 ? "This page could not be found." : "An unexpected error occurred."}</p>
	<a href="/admin">← Back to admin</a>
</div>

<style>
	.error-page {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		min-height: 60vh;
		text-align: center;
		gap: 1rem;
		color: rgba(var(--paper-rgb), 0.82);
	}

	h1 {
		font-family: var(--font-serif);
		font-weight: 400;
		font-size: 1.75rem;
		color: rgba(var(--paper-rgb), 0.95);
		margin: 0;
		letter-spacing: 0.01em;
	}

	p {
		color: rgba(var(--paper-rgb), 0.55);
		font-size: 0.9375rem;
		margin: 0;
	}

	a {
		color: rgba(var(--paper-rgb), 0.82);
		text-decoration: none;
		font-size: 0.875rem;
		padding: 0.5rem 1rem;
		border: 1px solid rgba(var(--paper-rgb), 0.14);
		border-radius: 2px;
		transition: color 0.15s ease, border-color 0.15s ease;
	}

	a:hover {
		color: rgba(var(--paper-rgb), 1);
		border-color: rgba(var(--paper-rgb), 0.3);
	}
</style>
