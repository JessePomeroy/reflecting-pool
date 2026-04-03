<script lang="ts">
import { page } from "$app/stores";
</script>

<div class="error-page">
	<h1>something went wrong</h1>
	<p>{$page.status === 404 ? 'this page could not be found.' : 'an unexpected error occurred.'}</p>
	<a href="/admin">← back to admin</a>
</div>

<style>
	.error-page {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		min-height: 60vh;
		font-family: 'Cormorant', serif;
		background: #0f1219;
		color: #c8cfd8;
		text-align: center;
		gap: 1rem;
	}

	h1 {
		font-weight: 300;
		font-size: 2rem;
		color: #e2e5ea;
	}

	p {
		color: rgba(200, 207, 216, 0.5);
	}

	a {
		color: #c8cfd8;
		text-decoration: underline;
		opacity: 0.7;
		transition: opacity 0.2s ease;
	}

	a:hover {
		opacity: 1;
	}
</style>
