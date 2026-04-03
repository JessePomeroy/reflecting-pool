<script lang="ts">
import { page } from "$app/stores";
</script>

<div class="error-page">
	<h1>something went wrong</h1>
	<p>{$page.status === 404 ? 'this print could not be found.' : 'please try again in a moment.'}</p>
	<a href="/shop">← back to shop</a>
</div>

<style>
	.error-page {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		min-height: 60vh;
		font-family: 'Cormorant', serif;
		color: #1a1f2e;
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
		color: #1a1f2e;
		text-decoration: underline;
	}
</style>
