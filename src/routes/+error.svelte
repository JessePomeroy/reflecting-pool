<script lang="ts">
import { page } from '$app/stores';
</script>

<svelte:head>
	<title>{$page.status} · margaret helena</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<div class="error-page">
	<div class="error-content">
		<span class="error-code">{$page.status}</span>
		<h1 class="error-message">
			{#if $page.status === 404}
				page not found
			{:else}
				something went wrong
			{/if}
		</h1>
		<p class="error-detail">
			{#if $page.status === 404}
				this page has wandered off — like a petal in the wind.
			{:else}
				{$page.error?.message ?? 'an unexpected error occurred.'}
			{/if}
		</p>
		<a href="/" class="home-link">← back to gallery</a>
	</div>
</div>

<style>
	.error-page {
		min-height: 100vh;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 2rem;
		background: #c8cfd8;
	}

	.error-content {
		text-align: center;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1rem;
	}

	.error-code {
		font-family: 'Cormorant', serif;
		font-size: 5rem;
		font-weight: 300;
		color: rgba(26, 31, 46, 0.12);
		line-height: 1;
		letter-spacing: 0.1em;
		display: block;
	}

	h1.error-message {
		font-family: 'Cormorant', serif;
		font-weight: 300;
		font-size: 2rem;
		color: #1a1f2e;
		letter-spacing: 0.12em;
		text-transform: lowercase;
		margin: 0;
	}

	.error-detail {
		font-family: 'Cormorant', serif;
		font-size: 1rem;
		color: rgba(26, 31, 46, 0.5);
		font-style: italic;
		max-width: 320px;
		line-height: 1.6;
	}

	.home-link {
		display: inline-block;
		margin-top: 1rem;
		font-family: 'Cormorant', serif;
		font-size: 0.9rem;
		letter-spacing: 0.06em;
		color: rgba(26, 31, 46, 0.5);
		text-decoration: none;
		transition: color 0.25s ease;
	}

	.home-link:hover {
		color: rgba(26, 31, 46, 0.8);
	}
</style>
