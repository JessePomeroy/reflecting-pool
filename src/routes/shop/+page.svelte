<script lang="ts">
import { formatPrice, getStartingPrice } from "$lib/shop/pricing";
import type { PageData } from "./$types";

let { data }: { data: PageData } = $props();

const startingPrice = getStartingPrice();
</script>

<svelte:head>
	<title>shop · margaret helena photography</title>
	<meta name="description" content="Fine art photography prints on archival paper" />
</svelte:head>

<div class="shop-page">
	<header class="shop-header">
		<a href="/" class="back-link">← back to gallery</a>
		<h1>prints</h1>
		<p class="shop-intro">
			Fine art photography prints on museum-quality paper. Each print is made to order and
			shipped directly to you.
		</p>
		<p class="starting-price">starting from {formatPrice(startingPrice)}</p>
	</header>

	{#if data.products.length === 0}
		<div class="empty-state">
			<p>No prints available at the moment. Check back soon.</p>
		</div>
	{:else}
		<div class="prints-grid">
			{#each data.products as product (product.id)}
				<a href="/shop/{product.slug}" class="print-card">
					<div class="print-image-wrapper">
						<img
							src={product.imageUrl}
							alt={product.alt}
							loading="lazy"
							class="print-image"
						/>
					</div>
					<div class="print-info">
						<h2 class="print-title">{product.title}</h2>
						<p class="print-gallery">{product.galleryTitle}</p>
						<p class="print-price">from {formatPrice(startingPrice)}</p>
					</div>
				</a>
			{/each}
		</div>
	{/if}
</div>

<style>
	.shop-page {
		min-height: 100vh;
		padding: 2rem;
		max-width: 1200px;
		margin: 0 auto;
	}

	.shop-header {
		text-align: center;
		margin-bottom: 4rem;
		padding-top: 2rem;
	}

	.back-link {
		display: inline-block;
		color: rgba(26, 31, 46, 0.5);
		text-decoration: none;
		font-size: 0.9rem;
		letter-spacing: 0.05em;
		margin-bottom: 2rem;
		transition: color 0.3s ease;
	}

	.back-link:hover {
		color: rgba(26, 31, 46, 0.8);
	}

	h1 {
		font-family: 'Cormorant', serif;
		font-weight: 300;
		font-size: 3rem;
		color: #1a1f2e;
		letter-spacing: 0.15em;
		text-transform: lowercase;
		margin-bottom: 1rem;
	}

	.shop-intro {
		font-family: 'Cormorant', serif;
		font-size: 1.1rem;
		color: rgba(26, 31, 46, 0.6);
		max-width: 500px;
		margin: 0 auto 0.5rem;
		line-height: 1.6;
	}

	.starting-price {
		font-family: 'Cormorant', serif;
		font-size: 0.95rem;
		color: rgba(26, 31, 46, 0.4);
		letter-spacing: 0.05em;
	}

	.empty-state {
		text-align: center;
		padding: 4rem 2rem;
		color: rgba(26, 31, 46, 0.5);
		font-style: italic;
	}

	.prints-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
		gap: 2.5rem;
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
		padding: 1rem 0;
	}

	.print-title {
		font-family: 'Cormorant', serif;
		font-weight: 400;
		font-size: 1.2rem;
		color: #1a1f2e;
		margin-bottom: 0.25rem;
	}

	.print-gallery {
		font-family: 'Cormorant', serif;
		font-size: 0.85rem;
		color: rgba(26, 31, 46, 0.4);
		letter-spacing: 0.05em;
		text-transform: lowercase;
		margin-bottom: 0.25rem;
	}

	.print-price {
		font-family: 'Cormorant', serif;
		font-size: 0.95rem;
		color: rgba(26, 31, 46, 0.6);
	}

	@media (max-width: 640px) {
		.prints-grid {
			grid-template-columns: 1fr;
			gap: 2rem;
		}

		h1 {
			font-size: 2.2rem;
		}

		.shop-page {
			padding: 1rem;
		}
	}
</style>
