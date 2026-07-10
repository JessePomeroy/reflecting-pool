<script lang="ts">
import { formatPrice, getRetailPrice } from "$lib/shop/pricing";
import { shopCollectionPath } from "$lib/shop/urls";
import type { PageData } from "./$types";

let { data }: { data: PageData } = $props();

let selectedPaper = $state<string>("Archival Matte");
let selectedSizeIndex = $state(1); // default to 8×10

let selectedSize = $derived(data.sizes[selectedSizeIndex]);
let currentPrice = $derived(getRetailPrice(selectedPaper, selectedSize));
let productJsonLd = $derived(
	JSON.stringify({
		"@context": "https://schema.org",
		"@type": "Product",
		name: data.product.title,
		image: data.product.imageUrl,
		description: "Fine art photography print on archival paper",
		offers: {
			"@type": "Offer",
			priceCurrency: "USD",
			price: String(getRetailPrice(selectedPaper, data.sizes[0]) ?? 0),
			availability: "https://schema.org/InStock",
		},
	}).replace(/</g, "\\u003c"),
);
let isSubmitting = $state(false);
// Audit H27: surface checkout errors to the customer instead of swallowing
// them in a console.error. A failed /api/checkout call was previously just
// an isSubmitting = false with no visible feedback — the button silently
// became clickable again.
let checkoutError = $state<string | null>(null);

function getSelectedSubcategoryId(): number {
	const paper = data.paperOptions.find((p) => p.name === selectedPaper);
	return paper?.subcategoryId ?? 0;
}

async function handleCheckout() {
	if (!currentPrice || isSubmitting) return;
	isSubmitting = true;
	checkoutError = null;

	try {
		const res = await fetch("/api/checkout", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				productSlug: data.product.slug,
				imageUrl: data.product.imageUrl,
				imageTitle: data.product.title,
				paperName: selectedPaper,
				paperSubcategoryId: getSelectedSubcategoryId(),
				paperWidth: selectedSize.width,
				paperHeight: selectedSize.height,
				paperSizeLabel: selectedSize.label,
				priceInDollars: currentPrice,
			}),
		});

		if (!res.ok) {
			const text = await res.text().catch(() => "");
			throw new Error(text || `checkout failed (${res.status})`);
		}

		const { url } = await res.json();
		if (url) {
			window.location.href = url;
			return;
		}
		throw new Error("checkout session did not return a url.");
	} catch (err) {
		console.error("Checkout error:", err);
		checkoutError =
			err instanceof Error
				? err.message.toLowerCase()
				: "something went wrong. please try again.";
		isSubmitting = false;
	}
}
</script>

<svelte:head>
	<title>{data.product.title} · print · margaret helena</title>
	<script type="application/ld+json">{productJsonLd}</script>
</svelte:head>

<div class="product-page">
	<nav class="breadcrumb">
		<a href="/shop">shop</a>
		<span class="sep">›</span>
		<a href={shopCollectionPath(data.product.gallerySlug)}>{data.product.galleryTitle.toLowerCase()}</a>
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
				{#if checkoutError}
					<p class="checkout-error" role="alert" aria-live="polite">{checkoutError}</p>
				{/if}
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
		--shop-text: rgba(var(--paper-rgb), 0.9);
		--shop-body: rgba(var(--paper-rgb), 0.76);
		--shop-muted: rgba(var(--paper-rgb), 0.58);
		--shop-faint: rgba(var(--paper-rgb), 0.38);
		--shop-panel-bg: rgba(var(--paper-rgb), 0.08);
		--shop-panel-bg-active: rgba(var(--paper-rgb), 0.14);
		min-height: 100vh;
		padding: 2rem;
		max-width: 1100px;
		margin: 0 auto;
		text-shadow: 0 1px 14px rgba(var(--ink-rgb), 0.2);
	}

	.breadcrumb {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		margin-bottom: 2rem;
		flex-wrap: wrap;
	}

	.breadcrumb a {
		font-family: var(--font-serif);
		font-size: 0.9rem;
		color: var(--shop-muted);
		text-decoration: none;
		letter-spacing: 0.05em;
		transition: color 0.3s ease;
	}

	.breadcrumb a:hover {
		color: var(--shop-text);
	}

	.breadcrumb .sep {
		color: var(--shop-faint);
		font-size: 0.85rem;
	}

	.breadcrumb .current {
		font-family: var(--font-serif);
		font-size: 0.9rem;
		color: var(--shop-body);
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
		background: rgba(var(--paper-rgb), 0.1);
		border-radius: 2px;
	}

	.product-image {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	.product-gallery {
		font-family: var(--font-serif);
		font-size: 0.85rem;
		color: var(--shop-muted);
		letter-spacing: 0.08em;
		text-transform: lowercase;
		margin-bottom: 0.5rem;
	}

	h1 {
		font-family: var(--font-serif);
		font-weight: 400;
		font-size: 2rem;
		color: var(--shop-text);
		margin-bottom: 0.5rem;
	}

	.product-caption {
		font-family: var(--font-serif);
		font-size: 1rem;
		color: var(--shop-body);
		font-style: italic;
		margin-bottom: 2rem;
		line-height: 1.5;
	}

	.option-group {
		margin-bottom: 1.5rem;
	}

	.option-label {
		display: block;
		font-family: var(--font-serif);
		font-size: 0.85rem;
		color: var(--shop-muted);
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
		border: 1px solid var(--shop-faint);
		border-radius: 2px;
		background: rgba(var(--ink-rgb), 0.08);
		cursor: pointer;
		transition: all 0.3s ease;
		text-align: left;
	}

	.paper-btn:hover {
		border-color: var(--shop-muted);
	}

	.paper-btn.active {
		border-color: var(--shop-text);
		background: var(--shop-panel-bg-active);
	}

	.paper-name {
		font-family: var(--font-serif);
		font-size: 1rem;
		color: var(--shop-text);
	}

	.paper-desc {
		font-family: var(--font-serif);
		font-size: 0.8rem;
		color: var(--shop-muted);
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
		border: 1px solid var(--shop-faint);
		border-radius: 2px;
		background: rgba(var(--ink-rgb), 0.08);
		cursor: pointer;
		transition: all 0.3s ease;
	}

	.size-btn:hover {
		border-color: var(--shop-muted);
	}

	.size-btn.active {
		border-color: var(--shop-text);
		background: var(--shop-panel-bg-active);
	}

	.size-label {
		font-family: var(--font-serif);
		font-size: 0.95rem;
		color: var(--shop-text);
	}

	.size-price {
		font-family: var(--font-serif);
		font-size: 0.75rem;
		color: var(--shop-muted);
		margin-top: 0.15rem;
	}

	.purchase-section {
		margin-top: 2rem;
		padding-top: 1.5rem;
		border-top: 1px solid var(--shop-faint);
	}

	.current-price {
		font-family: var(--font-serif);
		font-size: 1.8rem;
		font-weight: 300;
		color: var(--shop-text);
		margin-bottom: 1rem;
	}

	.buy-btn {
		width: 100%;
		padding: 0.9rem;
		font-family: var(--font-serif);
		font-size: 1.1rem;
		letter-spacing: 0.1em;
		text-transform: lowercase;
		color: #c8cfd8;
		background: var(--ink);
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
		font-family: var(--font-serif);
		font-size: 0.8rem;
		color: var(--shop-muted);
		text-align: center;
		margin-top: 0.75rem;
		line-height: 1.4;
	}

	.checkout-error {
		font-family: var(--font-serif);
		font-size: 0.85rem;
		font-style: italic;
		color: var(--shop-body);
		text-align: center;
		margin-top: 0.75rem;
		letter-spacing: 0.03em;
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
