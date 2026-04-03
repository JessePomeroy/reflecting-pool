<script lang="ts">
import { formatPrice, getStartingPrice } from "$lib/shop/pricing";
import type { PageData } from "./$types";

let { data }: { data: PageData } = $props();

const startingPrice = getStartingPrice();
</script>

<svelte:head>
	<title>{data.collection.title} · prints · margaret helena</title>
	<meta
		name="description"
		content={data.collection.description || `${data.collection.title} print collection`}
	/>
</svelte:head>

<div class="collection-page">
	<nav class="breadcrumb">
		<a href="/shop">shop</a>
		<span class="sep">›</span>
		<span class="current">{data.collection.title.toLowerCase()}</span>
	</nav>

	<header class="collection-header">
		<h1>{data.collection.title}</h1>
		{#if data.collection.description}
			<p class="collection-desc">{data.collection.description}</p>
		{/if}
		<p class="collection-count">
			{data.prints.length} print{data.prints.length === 1 ? "" : "s"} · from {formatPrice(
				startingPrice,
			)}
		</p>
	</header>

	{#if data.prints.length === 0}
		<div class="empty-state">
			<p>No prints in this collection yet.</p>
		</div>
	{:else}
		<div class="prints-grid">
			{#each data.prints as print (print.id)}
				<a href="/shop/{print.slug}" class="print-card">
					<div class="print-image-wrapper">
						<img
							src={print.imageUrl}
							alt={print.alt}
							loading="lazy"
							class="print-image"
						/>
					</div>
					<div class="print-info">
						<h2 class="print-title">{print.title}</h2>
						<p class="print-price">from {formatPrice(startingPrice)}</p>
					</div>
				</a>
			{/each}
		</div>
	{/if}

	<div class="back-section">
		<a href="/shop" class="back-link">← back to shop</a>
	</div>
</div>

<style>
	.collection-page {
		min-height: 100vh;
		padding: 2rem;
		max-width: 1200px;
		margin: 0 auto;
	}

	/* Breadcrumb */
	.breadcrumb {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		margin-bottom: 2rem;
		padding-top: 1rem;
	}

	.breadcrumb a {
		font-family: 'Cormorant', serif;
		font-size: 0.9rem;
		color: rgba(26, 31, 46, 0.5);
		text-decoration: none;
		letter-spacing: 0.05em;
		transition: color 0.3s ease;
	}

	.breadcrumb a:hover {
		color: rgba(26, 31, 46, 0.8);
	}

	.breadcrumb .sep {
		color: rgba(26, 31, 46, 0.3);
		font-size: 0.85rem;
	}

	.breadcrumb .current {
		font-family: 'Cormorant', serif;
		font-size: 0.9rem;
		color: rgba(26, 31, 46, 0.7);
		letter-spacing: 0.05em;
	}

	/* Header */
	.collection-header {
		text-align: center;
		margin-bottom: 3rem;
	}

	h1 {
		font-family: 'Cormorant', serif;
		font-weight: 300;
		font-size: 2.5rem;
		color: #1a1f2e;
		letter-spacing: 0.12em;
		text-transform: lowercase;
		margin-bottom: 0.75rem;
	}

	.collection-desc {
		font-family: 'Cormorant', serif;
		font-size: 1.05rem;
		color: rgba(26, 31, 46, 0.55);
		max-width: 520px;
		margin: 0 auto 0.5rem;
		line-height: 1.6;
		font-style: italic;
	}

	.collection-count {
		font-family: 'Cormorant', serif;
		font-size: 0.9rem;
		color: rgba(26, 31, 46, 0.4);
		letter-spacing: 0.05em;
	}

	/* Prints grid */
	.prints-grid {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 2rem;
	}

	.print-card {
		text-decoration: none;
		color: inherit;
		display: block;
		transition: transform 0.4s ease;
	}

	.print-card:hover {
		transform: translateY(-4px);
	}

	.print-image-wrapper {
		aspect-ratio: 4 / 5;
		overflow: hidden;
		background: rgba(26, 31, 46, 0.05);
		border-radius: 2px;
	}

	.print-image {
		width: 100%;
		height: 100%;
		object-fit: cover;
		transition: transform 0.6s ease;
	}

	.print-card:hover .print-image {
		transform: scale(1.03);
	}

	.print-info {
		padding: 0.75rem 0;
	}

	.print-title {
		font-family: 'Cormorant', serif;
		font-weight: 400;
		font-size: 1.1rem;
		color: #1a1f2e;
		margin-bottom: 0.2rem;
	}

	.print-price {
		font-family: 'Cormorant', serif;
		font-size: 0.9rem;
		color: rgba(26, 31, 46, 0.6);
	}

	.empty-state {
		text-align: center;
		padding: 4rem 2rem;
		color: rgba(26, 31, 46, 0.5);
		font-style: italic;
	}

	/* Back link */
	.back-section {
		text-align: center;
		margin-top: 3rem;
		padding-bottom: 2rem;
	}

	.back-link {
		font-family: 'Cormorant', serif;
		font-size: 0.9rem;
		color: rgba(26, 31, 46, 0.5);
		text-decoration: none;
		letter-spacing: 0.05em;
		transition: color 0.3s ease;
	}

	.back-link:hover {
		color: rgba(26, 31, 46, 0.8);
	}

	/* Responsive */
	@media (max-width: 900px) {
		.prints-grid {
			grid-template-columns: repeat(2, 1fr);
		}
	}

	@media (max-width: 640px) {
		.prints-grid {
			grid-template-columns: 1fr;
			gap: 1.5rem;
		}

		h1 {
			font-size: 1.8rem;
		}

		.collection-page {
			padding: 1rem;
		}
	}
</style>
