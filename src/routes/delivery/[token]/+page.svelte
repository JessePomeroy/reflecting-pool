<script lang="ts">
import { setupConvex, useConvexClient } from "@mmailaender/convex-svelte";
import { api } from "$convex/api";
import type { Id } from "$convex/dataModel";
import { PUBLIC_CONVEX_URL } from "$env/static/public";

let { data } = $props();

setupConvex(PUBLIC_CONVEX_URL);
const client = useConvexClient();

// The server is the source of truth for images. We overlay optimistic
// favorite toggles via a per-image override map so that navigations
// naturally flow through without clobbering user intent, and the read
// path stays derived from props instead of stale-captured state.
let favoriteOverrides = $state(new Map<string, boolean>());
let images = $derived(
	data.images.map((img) => ({
		...img,
		isFavorite: favoriteOverrides.get(img._id) ?? img.isFavorite,
	})),
);

let lightboxIndex = $state(-1);
let lightboxOpen = $derived(lightboxIndex >= 0);
let downloading = $state(false);
let downloadError = $state<string | null>(null);

let dialogEl = $state<HTMLDivElement | undefined>(undefined);
let previouslyFocused: HTMLElement | null = null;

function openLightbox(index: number) {
	previouslyFocused = document.activeElement as HTMLElement | null;
	lightboxIndex = index;
	requestAnimationFrame(() => {
		dialogEl?.querySelector<HTMLButtonElement>(".close-btn")?.focus();
	});
}

function closeLightbox() {
	lightboxIndex = -1;
	previouslyFocused?.focus();
}

function handleKeydown(e: KeyboardEvent) {
	if (!lightboxOpen) return;
	if (e.key === "Escape") {
		closeLightbox();
		return;
	}
	if (e.key === "ArrowRight" && lightboxIndex < images.length - 1) {
		lightboxIndex++;
	}
	if (e.key === "ArrowLeft" && lightboxIndex > 0) {
		lightboxIndex--;
	}
	// Inline focus trap — keep Tab inside the dialog when open.
	if (e.key === "Tab" && dialogEl) {
		const focusables = dialogEl.querySelectorAll<HTMLElement>(
			"button:not([disabled]), [href], [tabindex]:not([tabindex='-1'])",
		);
		if (focusables.length === 0) return;
		const first = focusables[0];
		const last = focusables[focusables.length - 1];
		const active = document.activeElement as HTMLElement | null;
		if (e.shiftKey && active === first) {
			e.preventDefault();
			last.focus();
		} else if (!e.shiftKey && active === last) {
			e.preventDefault();
			first.focus();
		}
	}
}

async function toggleFavorite(index: number) {
	if (!data.gallery.favoritesEnabled) return;
	const image = images[index];
	const newVal = !image.isFavorite;

	// Snapshot overrides for rollback on failure. Capture the whole map so
	// parallel writes on other keys aren't clobbered.
	const previousOverrides = favoriteOverrides;
	const next = new Map(favoriteOverrides);
	next.set(image._id, newVal);
	favoriteOverrides = next;

	try {
		await client.mutation(api.galleries.updateImage, {
			id: image._id as Id<"galleryImages">,
			isFavorite: newVal,
		});
	} catch (err) {
		console.error("favorite toggle failed", err);
		favoriteOverrides = previousOverrides;
		downloadError = "couldn't update favorite.";
		setTimeout(() => {
			downloadError = null;
		}, 4000);
	}
}

async function zipDownload(imageKeys: string[], fileSuffix: string) {
	if (imageKeys.length === 0) {
		downloadError = "no photos selected.";
		setTimeout(() => {
			downloadError = null;
		}, 4000);
		return;
	}
	downloading = true;
	downloadError = null;
	try {
		const res = await fetch(`${data.workerUrl}/download/zip`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				token: data.token,
				imageKeys,
				galleryName: `${data.gallery.name}${fileSuffix}`,
			}),
		});
		if (!res.ok) throw new Error("Download failed");

		const blob = await res.blob();
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = `${data.gallery.name.replace(/[^a-zA-Z0-9._-]/g, "_")}${fileSuffix}.zip`;
		a.click();
		URL.revokeObjectURL(url);
	} catch {
		downloadError = "download failed. please try again.";
		setTimeout(() => {
			downloadError = null;
		}, 6000);
	} finally {
		downloading = false;
	}
}

function downloadAll() {
	return zipDownload(
		images.map((img) => img.r2Key),
		"",
	);
}

function downloadFavorites() {
	return zipDownload(
		images.filter((img) => img.isFavorite).map((img) => img.r2Key),
		"-favorites",
	);
}

let favoriteCount = $derived(images.filter((img) => img.isFavorite).length);
</script>

<svelte:head>
	<title>{data.gallery.name} — margaret helena</title>
	<meta name="robots" content="noindex, nofollow" />
</svelte:head>

<svelte:window onkeydown={handleKeydown} />

<div class="delivery-page">
	<header class="page-header">
		<a href="/" class="back-link">← margaret helena</a>
		<h1>{data.gallery.name}</h1>
		<p class="meta">
			<span class="meta-item">{data.gallery.imageCount} photograph{data.gallery.imageCount !== 1 ? "s" : ""}</span>
			{#if data.client}
				<span class="divider">·</span>
				<span class="meta-item">for {data.client.name}</span>
			{/if}
		</p>

		{#if data.gallery.downloadEnabled}
			<div class="action-bar">
				<button
					type="button"
					class="ghost-btn"
					onclick={downloadAll}
					disabled={downloading}
				>
					{downloading ? "preparing…" : "download all"}
				</button>
				{#if data.gallery.favoritesEnabled && favoriteCount > 0}
					<button
						type="button"
						class="ghost-btn muted"
						onclick={downloadFavorites}
						disabled={downloading}
					>
						download favorites · {favoriteCount}
					</button>
				{/if}
			</div>
		{/if}

		{#if downloadError}
			<p class="error-note" role="alert">{downloadError}</p>
		{/if}
	</header>

	<div class="image-grid">
		{#each images as image, i (image._id)}
			<div class="grid-cell">
				<button
					type="button"
					class="thumb-btn"
					onclick={() => openLightbox(i)}
					aria-label="view photograph {i + 1} of {images.length}"
				>
					<img
						src={image.thumbUrl}
						alt="photograph {i + 1}: {image.filename}"
						loading="lazy"
					/>
				</button>
				{#if data.gallery.favoritesEnabled}
					<button
						type="button"
						class="fav-btn"
						class:is-fav={image.isFavorite}
						onclick={() => toggleFavorite(i)}
						aria-label={image.isFavorite ? "remove from favorites" : "add to favorites"}
					>
						{image.isFavorite ? "♥" : "♡"}
					</button>
				{/if}
			</div>
		{/each}
	</div>

	{#if images.length === 0}
		<p class="empty-note"><em>no photographs yet.</em></p>
	{/if}
</div>

{#if lightboxOpen}
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div
		bind:this={dialogEl}
		class="lightbox"
		role="dialog"
		aria-modal="true"
		aria-label="photograph viewer"
		tabindex="-1"
		onclick={(e) => {
			if (e.target === e.currentTarget) closeLightbox();
		}}
	>
		<div class="lightbox-overlay"></div>

		<!-- svelte-ignore a11y_click_events_have_key_events -->
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div class="lightbox-content" onclick={(e) => e.stopPropagation()}>
			<img
				src={images[lightboxIndex].previewUrl}
				alt={images[lightboxIndex].filename}
				class="lightbox-image"
			/>
			<div class="lightbox-meta">
				<span class="filename">{images[lightboxIndex].filename}</span>
				<span class="counter" aria-live="polite">{lightboxIndex + 1} / {images.length}</span>
			</div>
			<div class="lightbox-actions">
				{#if data.gallery.favoritesEnabled}
					<button
						type="button"
						class="ghost-btn small"
						class:is-fav={images[lightboxIndex].isFavorite}
						onclick={() => toggleFavorite(lightboxIndex)}
					>
						{images[lightboxIndex].isFavorite ? "♥ favorited" : "♡ favorite"}
					</button>
				{/if}
				{#if data.gallery.downloadEnabled}
					<a
						class="ghost-btn small"
						href={images[lightboxIndex].downloadUrl}
						download
					>
						↓ download
					</a>
				{/if}
			</div>
		</div>

		{#if lightboxIndex > 0}
			<button
				type="button"
				class="nav-btn prev"
				aria-label="previous photograph"
				onclick={(e) => { e.stopPropagation(); lightboxIndex--; }}
			>
				‹
			</button>
		{/if}
		{#if lightboxIndex < images.length - 1}
			<button
				type="button"
				class="nav-btn next"
				aria-label="next photograph"
				onclick={(e) => { e.stopPropagation(); lightboxIndex++; }}
			>
				›
			</button>
		{/if}
		<button
			type="button"
			class="close-btn"
			aria-label="close viewer"
			onclick={closeLightbox}
		>
			×
		</button>
	</div>
{/if}

<style>
	/* ─── Page ──────────────────────────────────────────── */
	.delivery-page {
		min-height: 100vh;
		padding: 2rem;
		max-width: 1200px;
		margin: 0 auto;
	}

	/* ─── Header ────────────────────────────────────────── */
	.page-header {
		text-align: center;
		margin-bottom: 3rem;
		padding-top: 2rem;
	}

	.back-link {
		display: inline-block;
		color: rgba(var(--paper-rgb), 0.45);
		text-decoration: none;
		font-family: var(--font-serif);
		font-size: 0.85rem;
		letter-spacing: 0.15em;
		text-transform: lowercase;
		margin-bottom: 2rem;
		transition: color 300ms ease;
	}

	.back-link:hover {
		color: rgba(var(--paper-rgb), 0.8);
	}

	h1 {
		font-family: var(--font-serif);
		font-weight: 300;
		font-size: 2.6rem;
		color: rgba(var(--paper-rgb), 0.95);
		letter-spacing: 0.12em;
		text-transform: lowercase;
		margin: 0 0 0.75rem;
	}

	.meta {
		font-family: var(--font-serif);
		font-size: 0.95rem;
		color: rgba(var(--paper-rgb), 0.55);
		letter-spacing: 0.05em;
		margin: 0 0 1.75rem;
	}

	.meta-item {
		font-style: italic;
	}

	.divider {
		margin: 0 0.5rem;
		opacity: 0.5;
	}

	/* ─── Action bar ────────────────────────────────────── */
	.action-bar {
		display: flex;
		gap: 0.75rem;
		justify-content: center;
		flex-wrap: wrap;
	}

	.ghost-btn {
		font-family: var(--font-serif);
		font-size: 0.85rem;
		font-weight: 400;
		letter-spacing: 0.15em;
		text-transform: lowercase;
		color: rgba(var(--paper-rgb), 0.85);
		background: transparent;
		border: 1px solid rgba(var(--paper-rgb), 0.3);
		border-radius: 2px;
		padding: 0.8rem 1.75rem;
		cursor: pointer;
		min-height: 44px;
		text-decoration: none;
		transition:
			background 300ms ease,
			color 300ms ease,
			border-color 300ms ease;
	}

	.ghost-btn:hover:not(:disabled) {
		background: rgba(var(--paper-rgb), 0.08);
		border-color: rgba(var(--paper-rgb), 0.55);
		color: rgba(var(--paper-rgb), 1);
	}

	.ghost-btn:disabled {
		opacity: 0.4;
		cursor: wait;
	}

	.ghost-btn.muted {
		color: rgba(var(--paper-rgb), 0.6);
		border-color: rgba(var(--paper-rgb), 0.2);
	}

	.ghost-btn.small {
		padding: 0.5rem 1.1rem;
		font-size: 0.78rem;
		min-height: 36px;
	}

	.ghost-btn.is-fav {
		color: rgba(var(--paper-rgb), 1);
		border-color: rgba(var(--paper-rgb), 0.6);
	}

	.error-note {
		font-family: var(--font-serif);
		font-size: 0.85rem;
		font-style: italic;
		letter-spacing: 0.05em;
		color: rgba(var(--paper-rgb), 0.7);
		margin-top: 1.25rem;
	}

	.empty-note {
		font-family: var(--font-serif);
		color: rgba(var(--paper-rgb), 0.55);
		text-align: center;
		letter-spacing: 0.05em;
		padding: 2rem;
	}

	/* ─── Grid ──────────────────────────────────────────── */
	.image-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
		gap: 1rem;
	}

	.grid-cell {
		position: relative;
		aspect-ratio: 1;
		overflow: hidden;
		border-radius: 2px;
		background: rgba(var(--ink-rgb), 0.35);
	}

	.thumb-btn {
		display: block;
		width: 100%;
		height: 100%;
		padding: 0;
		border: none;
		background: none;
		cursor: pointer;
		overflow: hidden;
	}

	.thumb-btn img {
		width: 100%;
		height: 100%;
		object-fit: cover;
		display: block;
		opacity: 0.92;
	}

	@media (prefers-reduced-motion: no-preference) {
		.thumb-btn img {
			transition:
				transform 400ms ease,
				opacity 300ms ease;
		}
		.thumb-btn:hover img,
		.thumb-btn:focus-visible img {
			transform: scale(1.025);
			opacity: 1;
		}
	}

	.fav-btn {
		position: absolute;
		top: 0.6rem;
		right: 0.6rem;
		width: 36px;
		height: 36px;
		border-radius: 50%;
		border: 1px solid rgba(var(--paper-rgb), 0.25);
		background: rgba(var(--ink-rgb), 0.55);
		color: rgba(var(--paper-rgb), 0.85);
		font-family: var(--font-serif);
		font-size: 1.1rem;
		line-height: 1;
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
		opacity: 0;
		transition:
			opacity 300ms ease,
			background 300ms ease,
			border-color 300ms ease,
			color 300ms ease;
	}

	.grid-cell:hover .fav-btn,
	.grid-cell:focus-within .fav-btn,
	.fav-btn:focus-visible,
	.fav-btn.is-fav {
		opacity: 1;
	}

	.fav-btn:hover {
		background: rgba(var(--ink-rgb), 0.75);
		border-color: rgba(var(--paper-rgb), 0.5);
	}

	.fav-btn.is-fav {
		color: rgba(var(--paper-rgb), 1);
		border-color: rgba(var(--paper-rgb), 0.65);
		background: rgba(var(--ink-rgb), 0.75);
	}

	/* ─── Lightbox ──────────────────────────────────────── */
	.lightbox {
		position: fixed;
		inset: 0;
		z-index: 200;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 2rem;
	}

	.lightbox-overlay {
		position: absolute;
		inset: 0;
		background: rgba(10, 12, 18, 0.96);
	}

	.lightbox-content {
		position: relative;
		z-index: 1;
		max-width: 90vw;
		max-height: 90vh;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1rem;
	}

	.lightbox-image {
		max-width: 90vw;
		max-height: 76vh;
		object-fit: contain;
		border-radius: 2px;
		box-shadow: 0 8px 40px rgba(0, 0, 0, 0.5);
	}

	.lightbox-meta {
		display: flex;
		align-items: center;
		gap: 1.25rem;
		color: rgba(var(--paper-rgb), 0.55);
		font-family: var(--font-serif);
		font-size: 0.82rem;
		letter-spacing: 0.12em;
	}

	.filename {
		font-style: italic;
	}

	.counter {
		font-variant-numeric: tabular-nums;
	}

	.lightbox-actions {
		display: flex;
		gap: 0.75rem;
		flex-wrap: wrap;
		justify-content: center;
	}

	.nav-btn {
		position: fixed;
		top: 50%;
		transform: translateY(-50%);
		z-index: 2;
		background: none;
		border: 1px solid rgba(var(--paper-rgb), 0.2);
		border-radius: 50%;
		color: rgba(var(--paper-rgb), 0.7);
		font-size: 1.5rem;
		width: 44px;
		height: 44px;
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
		transition:
			border-color 300ms ease,
			color 300ms ease;
	}

	.nav-btn.prev {
		left: 1.25rem;
	}
	.nav-btn.next {
		right: 1.25rem;
	}

	.nav-btn:hover {
		border-color: rgba(var(--paper-rgb), 0.5);
		color: rgba(var(--paper-rgb), 1);
	}

	.close-btn {
		position: fixed;
		top: 1.25rem;
		right: 1.25rem;
		z-index: 2;
		background: none;
		border: none;
		color: rgba(var(--paper-rgb), 0.6);
		font-size: 1.75rem;
		width: 44px;
		height: 44px;
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
		transition: color 300ms ease;
	}

	.close-btn:hover {
		color: rgba(var(--paper-rgb), 1);
	}

	/* ─── Responsive ────────────────────────────────────── */
	@media (max-width: 768px) {
		.delivery-page {
			padding: 1.25rem;
		}
		h1 {
			font-size: 1.9rem;
		}
		.page-header {
			margin-bottom: 2rem;
		}
		.image-grid {
			grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
			gap: 0.5rem;
		}
		.fav-btn {
			opacity: 1;
		}
		.lightbox {
			padding: 1rem;
		}
		.nav-btn {
			width: 38px;
			height: 38px;
			font-size: 1.25rem;
		}
	}
</style>
