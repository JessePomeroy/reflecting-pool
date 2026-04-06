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

	<!-- Collections -->
	{#if data.collections.length > 0}
		<section class="collections-section">
			<h2 class="section-title">collections</h2>
			<div class="collections-grid">
				{#each data.collections as collection (collection.id)}
					<a href="/shop/collection/{collection.slug}" class="collection-card">
						<div class="collection-image-wrapper">
							<img
								src={collection.coverImage}
								alt={collection.title}
								loading="lazy"
								class="collection-image"
							/>
							<div class="collection-overlay">
								<h3 class="collection-title">{collection.title}</h3>
								<span class="collection-count"
									>{collection.printCount} print{collection.printCount === 1
										? ""
										: "s"}</span
								>
							</div>
						</div>
					</a>
				{/each}
			</div>
		</section>
	{/if}

	<!-- All Prints -->
	<section class="prints-section">
		<h2 class="section-title">all prints</h2>
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
							<h3 class="print-title">{product.title}</h3>
							<p class="print-gallery">{product.galleryTitle}</p>
							<p class="print-price">from {formatPrice(startingPrice)}</p>
						</div>
					</a>
				{/each}
			</div>
		{/if}
	</section>
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
		color: rgba(var(--ink-rgb), 0.5);
		text-decoration: none;
		font-size: 0.9rem;
		letter-spacing: 0.05em;
		margin-bottom: 2rem;
		transition: color 0.3s ease;
	}

	.back-link:hover {
		color: rgba(var(--ink-rgb), 0.8);
	}

	h1 {
		font-family: var(--font-serif);
		font-weight: 300;
		font-size: 3rem;
		color: var(--ink);
		letter-spacing: 0.15em;
		text-transform: lowercase;
		margin-bottom: 1rem;
	}

	.shop-intro {
		font-family: var(--font-serif);
		font-size: 1.1rem;
		color: rgba(var(--ink-rgb), 0.6);
		max-width: 500px;
		margin: 0 auto 0.5rem;
		line-height: 1.6;
	}

	.starting-price {
		font-family: var(--font-serif);
		font-size: 0.95rem;
		color: rgba(var(--ink-rgb), 0.4);
		letter-spacing: 0.05em;
	}

	/* Section titles */
	.section-title {
		font-family: var(--font-serif);
		font-weight: 300;
		font-size: 1.4rem;
		color: rgba(var(--ink-rgb), 0.5);
		letter-spacing: 0.12em;
		text-transform: lowercase;
		margin-bottom: 1.5rem;
	}

	/* Collections grid */
	.collections-section {
		margin-bottom: 4rem;
	}

	.collections-grid {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 1.5rem;
	}

	.collection-card {
		text-decoration: none;
		color: inherit;
		display: block;
		transition: transform 0.4s ease;
	}

	.collection-card:hover {
		transform: translateY(-4px);
	}

	.collection-image-wrapper {
		position: relative;
		aspect-ratio: 3 / 4;
		overflow: hidden;
		background: rgba(var(--ink-rgb), 0.05);
		border-radius: 2px;
	}

	.collection-image {
		width: 100%;
		height: 100%;
		object-fit: cover;
		transition: transform 0.6s ease;
	}

	.collection-card:hover .collection-image {
		transform: scale(1.04);
	}

	.collection-overlay {
		position: absolute;
		bottom: 0;
		left: 0;
		right: 0;
		padding: 2rem 1.25rem 1.25rem;
		background: linear-gradient(to top, rgba(var(--ink-rgb), 0.7) 0%, transparent 100%);
		display: flex;
		flex-direction: column;
		justify-content: flex-end;
	}

	.collection-title {
		font-family: var(--font-serif);
		font-weight: 400;
		font-size: 1.3rem;
		color: #f0f0f0;
		letter-spacing: 0.05em;
		margin-bottom: 0.2rem;
	}

	.collection-count {
		font-family: var(--font-serif);
		font-size: 0.8rem;
		color: rgba(240, 240, 240, 0.65);
		letter-spacing: 0.06em;
	}

	/* Prints grid */
	.prints-section {
		margin-bottom: 4rem;
	}

	.prints-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
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
		background: rgba(var(--ink-rgb), 0.05);
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
		font-family: var(--font-serif);
		font-weight: 400;
		font-size: 1.1rem;
		color: var(--ink);
		margin-bottom: 0.2rem;
	}

	.print-gallery {
		font-family: var(--font-serif);
		font-size: 0.8rem;
		color: rgba(var(--ink-rgb), 0.4);
		letter-spacing: 0.05em;
		text-transform: lowercase;
		margin-bottom: 0.2rem;
	}

	.print-price {
		font-family: var(--font-serif);
		font-size: 0.9rem;
		color: rgba(var(--ink-rgb), 0.6);
	}

	.empty-state {
		text-align: center;
		padding: 4rem 2rem;
		color: rgba(var(--ink-rgb), 0.5);
		font-style: italic;
	}

	/* Responsive */
	@media (max-width: 900px) {
		.collections-grid {
			grid-template-columns: repeat(2, 1fr);
		}
	}

	@media (max-width: 640px) {
		.collections-grid {
			grid-template-columns: 1fr 1fr;
			gap: 1rem;
		}

		.prints-grid {
			grid-template-columns: 1fr;
			gap: 1.5rem;
		}

		h1 {
			font-size: 2.2rem;
		}

		.shop-page {
			padding: 1rem;
		}

		.collection-title {
			font-size: 1.1rem;
		}

		.collection-overlay {
			padding: 1.5rem 1rem 1rem;
		}
	}
</style>
