<script lang="ts">
import { formatPrice, getRetailPrice } from "$lib/shop/pricing";
import type { PaperType } from "$lib/shop/types";
import type { PageData } from "./$types";

let { data }: { data: PageData } = $props();

let selectedPaper = $state<PaperType>("Archival Matte");
let selectedSizeIndex = $state(1); // default to 8×10

let selectedSize = $derived(data.sizes[selectedSizeIndex]);
let currentPrice = $derived(getRetailPrice(selectedPaper, selectedSize));
let isSubmitting = $state(false);

async function handleCheckout() {
	if (!currentPrice || isSubmitting) return;
	isSubmitting = true;

	try {
		const res = await fetch("/api/checkout", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				productSlug: data.product.slug,
				imageUrl: data.product.imageUrl,
				imageTitle: data.product.title,
				paperName: selectedPaper,
				paperSubcategoryId: selectedPaper === "Archival Matte" ? 103001 : 103007,
				paperWidth: selectedSize.width,
				paperHeight: selectedSize.height,
				paperSizeLabel: selectedSize.label,
				priceInDollars: currentPrice,
			}),
		});

		const { url } = await res.json();
		if (url) {
			window.location.href = url;
		}
	} catch (err) {
		console.error("Checkout error:", err);
		isSubmitting = false;
	}
}
</script>

<svelte:head>
	<title>{data.product.title} · print · margaret helena</title>
	{@html `<script type="application/ld+json">${JSON.stringify({
		"@context": "https://schema.org",
		"@type": "Product",
		"name": data.product.title,
		"image": data.product.imageUrl,
		"description": "Fine art photography print on archival paper",
		"offers": {
			"@type": "Offer",
			"priceCurrency": "USD",
			"price": String(getRetailPrice(selectedPaper, data.sizes[0]) ?? 0),
			"availability": "https://schema.org/InStock"
		}
	})}<\/script>`}
</svelte:head>

<div class="product-page">
	<nav class="breadcrumb">
		<a href="/shop">shop</a>
		<span class="sep">›</span>
		<a href="/shop/collection/{data.product.gallerySlug}">{data.product.galleryTitle.toLowerCase()}</a>
		<span class="sep">›</span>
		<span class="current">{data.product.title.toLowerCase()}</span>
	</nav>

	<div class="product-layout">
		<div class="product-image-wrapper">
			<img
				src={data.product.imageUrl}
				alt={data.product.alt}
				class="product-image"
			/>
		</div>

		<div class="product-details">
			<p class="product-gallery">{data.product.galleryTitle}</p>
			<h1>{data.product.title}</h1>
			{#if data.product.caption}
				<p class="product-caption">{data.product.caption}</p>
			{/if}

			<div class="option-group">
				<span class="option-label">paper</span>
				<div class="paper-options">
					{#each data.paperOptions as paper (paper.name)}
						<button
							class="paper-btn"
							class:active={selectedPaper === paper.name}
							onclick={() => (selectedPaper = paper.name)}
						>
							<span class="paper-name">{paper.name}</span>
							<span class="paper-desc">{paper.description}</span>
						</button>
					{/each}
				</div>
			</div>

			<div class="option-group">
				<span class="option-label">size</span>
				<div class="size-options">
					{#each data.sizes as size, i (size.label)}
						{@const price = getRetailPrice(selectedPaper, size)}
						<button
							class="size-btn"
							class:active={selectedSizeIndex === i}
							onclick={() => (selectedSizeIndex = i)}
						>
							<span class="size-label">{size.label}</span>
							{#if price}
								<span class="size-price">{formatPrice(price)}</span>
							{/if}
						</button>
					{/each}
				</div>
			</div>

			<div class="purchase-section">
				{#if currentPrice}
					<p class="current-price">{formatPrice(currentPrice)}</p>
				{/if}
				<button
					class="buy-btn"
					onclick={handleCheckout}
					disabled={!currentPrice || isSubmitting}
				>
					{isSubmitting ? 'redirecting…' : 'buy now'}
				</button>
				<p class="shipping-note">
					Free shipping on all orders. Prints are made to order — allow 2–3 weeks for
					delivery.
				</p>
			</div>
		</div>
	</div>
</div>

<style>
	.product-page {
		min-height: 100vh;
		padding: 2rem;
		max-width: 1100px;
		margin: 0 auto;
	}

	.breadcrumb {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		margin-bottom: 2rem;
		flex-wrap: wrap;
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

	.product-layout {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 4rem;
		align-items: start;
	}

	.product-image-wrapper {
		aspect-ratio: 4 / 5;
		overflow: hidden;
		background: rgba(26, 31, 46, 0.05);
		border-radius: 2px;
	}

	.product-image {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	.product-gallery {
		font-family: 'Cormorant', serif;
		font-size: 0.85rem;
		color: rgba(26, 31, 46, 0.4);
		letter-spacing: 0.08em;
		text-transform: lowercase;
		margin-bottom: 0.5rem;
	}

	h1 {
		font-family: 'Cormorant', serif;
		font-weight: 400;
		font-size: 2rem;
		color: #1a1f2e;
		margin-bottom: 0.5rem;
	}

	.product-caption {
		font-family: 'Cormorant', serif;
		font-size: 1rem;
		color: rgba(26, 31, 46, 0.5);
		font-style: italic;
		margin-bottom: 2rem;
		line-height: 1.5;
	}

	.option-group {
		margin-bottom: 1.5rem;
	}

	.option-label {
		display: block;
		font-family: 'Cormorant', serif;
		font-size: 0.85rem;
		color: rgba(26, 31, 46, 0.5);
		letter-spacing: 0.1em;
		text-transform: lowercase;
		margin-bottom: 0.75rem;
		user-select: none;
	}

	.paper-options {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.paper-btn {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		padding: 0.75rem 1rem;
		border: 1px solid rgba(26, 31, 46, 0.15);
		border-radius: 2px;
		background: transparent;
		cursor: pointer;
		transition: all 0.3s ease;
		text-align: left;
	}

	.paper-btn:hover {
		border-color: rgba(26, 31, 46, 0.3);
	}

	.paper-btn.active {
		border-color: #1a1f2e;
		background: rgba(26, 31, 46, 0.03);
	}

	.paper-name {
		font-family: 'Cormorant', serif;
		font-size: 1rem;
		color: #1a1f2e;
	}

	.paper-desc {
		font-family: 'Cormorant', serif;
		font-size: 0.8rem;
		color: rgba(26, 31, 46, 0.4);
		margin-top: 0.15rem;
	}

	.size-options {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: 0.5rem;
	}

	.size-btn {
		display: flex;
		flex-direction: column;
		align-items: center;
		padding: 0.6rem 0.5rem;
		border: 1px solid rgba(26, 31, 46, 0.15);
		border-radius: 2px;
		background: transparent;
		cursor: pointer;
		transition: all 0.3s ease;
	}

	.size-btn:hover {
		border-color: rgba(26, 31, 46, 0.3);
	}

	.size-btn.active {
		border-color: #1a1f2e;
		background: rgba(26, 31, 46, 0.03);
	}

	.size-label {
		font-family: 'Cormorant', serif;
		font-size: 0.95rem;
		color: #1a1f2e;
	}

	.size-price {
		font-family: 'Cormorant', serif;
		font-size: 0.75rem;
		color: rgba(26, 31, 46, 0.4);
		margin-top: 0.15rem;
	}

	.purchase-section {
		margin-top: 2rem;
		padding-top: 1.5rem;
		border-top: 1px solid rgba(26, 31, 46, 0.1);
	}

	.current-price {
		font-family: 'Cormorant', serif;
		font-size: 1.8rem;
		font-weight: 300;
		color: #1a1f2e;
		margin-bottom: 1rem;
	}

	.buy-btn {
		width: 100%;
		padding: 0.9rem;
		font-family: 'Cormorant', serif;
		font-size: 1.1rem;
		letter-spacing: 0.1em;
		text-transform: lowercase;
		color: #c8cfd8;
		background: #1a1f2e;
		border: none;
		border-radius: 2px;
		cursor: pointer;
		transition: all 0.3s ease;
	}

	.buy-btn:hover:not(:disabled) {
		background: #2a3142;
	}

	.buy-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.shipping-note {
		font-family: 'Cormorant', serif;
		font-size: 0.8rem;
		color: rgba(26, 31, 46, 0.4);
		text-align: center;
		margin-top: 0.75rem;
		line-height: 1.4;
	}

	@media (max-width: 768px) {
		.product-layout {
			grid-template-columns: 1fr;
			gap: 2rem;
		}

		.product-page {
			padding: 1rem;
		}

		h1 {
			font-size: 1.6rem;
		}

		.size-options {
			grid-template-columns: repeat(2, 1fr);
		}
	}
</style>
