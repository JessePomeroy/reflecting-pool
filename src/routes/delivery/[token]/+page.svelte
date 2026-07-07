<script lang="ts">
import { onMount } from "svelte";
import { setupConvex, useConvexClient } from "convex-svelte";
import { api } from "$convex/api";
import type { Id } from "$convex/dataModel";
import { PUBLIC_CONVEX_URL } from "$env/static/public";
import {
	canSaveGalleryZipFile,
	saveGalleryImagesAsZipFile,
} from "$lib/galleryDelivery/downloadArchive";
import {
	canChooseGalleryDownloadDirectory,
	saveGalleryImagesToDirectory,
} from "$lib/galleryDelivery/downloadDestination";
import {
	createGalleryDownloadPlan,
	type GalleryDownloadImage,
	type GalleryDownloadPlan,
	submitGalleryZipDownloadForm,
} from "$lib/galleryDelivery/downloadPlan";
import { chooseGalleryDownloadRoute } from "$lib/galleryDelivery/downloadRoute";
import {
	prepareGalleryZipDownload,
	triggerPreparedZipArchiveDownload,
	waitForPreparedZipArchive,
	type PreparedZipProgress,
} from "$lib/galleryDelivery/preparedZip";

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
let folderDownloadsSupported = $state(false);
let zipFileDownloadsSupported = $state(false);
let chooseDownloadFolder = $state(false);
let folderDownloadStatus = $state<string | null>(null);
let folderDownloadAbortController = $state<AbortController | null>(null);
let folderDownloadStatusToken = 0;
let selectedImageIds = $state(new Set<string>());
let galleryView = $state<"grid" | "list">("grid");
let selectedImages = $derived(images.filter((img) => selectedImageIds.has(img._id)));
let selectedCount = $derived(selectedImages.length);
let allImagesSelected = $derived(
	images.length > 0 && selectedCount === images.length,
);
let folderDownloadInProgress = $derived(folderDownloadAbortController !== null);
let chosenLocationDownloadsSupported = $derived(
	folderDownloadsSupported || zipFileDownloadsSupported,
);

let dialogEl = $state<HTMLDivElement | undefined>(undefined);
let previouslyFocused: HTMLElement | null = null;

onMount(() => {
	folderDownloadsSupported = canChooseGalleryDownloadDirectory(window);
	zipFileDownloadsSupported = canSaveGalleryZipFile(window);
});

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
			token: data.token,
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

function showDownloadError(message: string, timeout = 4000) {
	downloadError = message;
	setTimeout(() => {
		downloadError = null;
	}, timeout);
}

function toggleImageSelection(imageId: string) {
	const next = new Set(selectedImageIds);
	if (next.has(imageId)) {
		next.delete(imageId);
	} else {
		next.add(imageId);
	}
	selectedImageIds = next;
}

function selectAllImages() {
	selectedImageIds = new Set(images.map((img) => img._id));
}

function clearSelection() {
	selectedImageIds = new Set();
}

function triggerDownload(image: { downloadUrl: string | null; filename: string }) {
	if (!image.downloadUrl) {
		showDownloadError("downloads are disabled for this gallery.");
		return;
	}

	const a = document.createElement("a");
	a.href = image.downloadUrl;
	a.download = image.filename;
	a.rel = "noopener";
	document.body.appendChild(a);
	a.click();
	a.remove();
}

function submitZipDownload(plan: Extract<GalleryDownloadPlan, { type: "zip" }>) {
	submitGalleryZipDownloadForm({
		plan,
		document,
		setTimeout: window.setTimeout,
	});
}

function setFolderDownloadStatus(message: string | null) {
	folderDownloadStatus = message;
	folderDownloadStatusToken += 1;
	return folderDownloadStatusToken;
}

function clearFolderDownloadStatusLater(token: number, delayMs: number) {
	setTimeout(() => {
		if (folderDownloadStatusToken === token) {
			setFolderDownloadStatus(null);
		}
	}, delayMs);
}

async function saveImagesToFolder(targetImages: GalleryDownloadImage[]) {
	const controller = new AbortController();
	folderDownloadAbortController = controller;
	setFolderDownloadStatus("choose a folder to save this download.");
	try {
		await saveGalleryImagesToDirectory({
			images: targetImages,
			window,
			signal: controller.signal,
			onProgress(progress) {
				setFolderDownloadStatus(
					`saving ${progress.completed}/${progress.total} · ${progress.filename}`,
				);
			},
		});
		const statusToken = setFolderDownloadStatus(
			`saved ${targetImages.length} file${targetImages.length === 1 ? "" : "s"}.`,
		);
		clearFolderDownloadStatusLater(statusToken, 5000);
	} finally {
		if (folderDownloadAbortController === controller) {
			folderDownloadAbortController = null;
		}
	}
}

async function saveImagesToZip(targetImages: GalleryDownloadImage[], galleryName: string) {
	const controller = new AbortController();
	folderDownloadAbortController = controller;
	setFolderDownloadStatus("choose where to save this zip.");
	try {
		await saveGalleryImagesAsZipFile({
			images: targetImages,
			galleryName,
			window,
			signal: controller.signal,
			onProgress(progress) {
				setFolderDownloadStatus(
					`zipping ${progress.completed}/${progress.total} · ${progress.filename}`,
				);
			},
		});
		const statusToken = setFolderDownloadStatus(
			`saved ${targetImages.length} file${targetImages.length === 1 ? "" : "s"} as zip.`,
		);
		clearFolderDownloadStatusLater(statusToken, 5000);
	} finally {
		if (folderDownloadAbortController === controller) {
			folderDownloadAbortController = null;
		}
	}
}

function preparedZipStatusMessage(status: PreparedZipProgress) {
	if (status.status === "queued") return "queued zip build...";
	if (status.status === "building") {
		return `building zip ${status.processedBytes > 0 ? `${status.processedBytes} bytes processed` : `${status.imageCount} files`}`;
	}
	if (status.status === "ready") return "zip ready. starting download...";
	return "preparing zip...";
}

async function savePreparedZip(
	plan: Extract<GalleryDownloadPlan, { type: "tooLarge" }>,
	galleryName: string,
) {
	const controller = new AbortController();
	folderDownloadAbortController = controller;
	setFolderDownloadStatus("preparing zip...");
	try {
		const initialStatus = await prepareGalleryZipDownload({
			fetch: window.fetch.bind(window),
			plan,
			signal: controller.signal,
		});
		const archiveUrl = await waitForPreparedZipArchive({
			clearTimeout: window.clearTimeout,
			fetch: window.fetch.bind(window),
			initialStatus,
			onStatus(status) {
				setFolderDownloadStatus(preparedZipStatusMessage(status));
			},
			setTimeout: window.setTimeout,
			signal: controller.signal,
			token: data.token,
			workerUrl: data.workerUrl,
		});
		triggerPreparedZipArchiveDownload({
			document,
			filename: `${galleryName}.zip`,
			url: archiveUrl,
		});
		const statusToken = setFolderDownloadStatus("zip download started.");
		clearFolderDownloadStatusLater(statusToken, 5000);
	} finally {
		if (folderDownloadAbortController === controller) {
			folderDownloadAbortController = null;
		}
	}
}

function isPickerAbort(error: unknown) {
	return error instanceof DOMException && error.name === "AbortError";
}

function cancelFolderDownload() {
	setFolderDownloadStatus("canceling download...");
	folderDownloadAbortController?.abort(new DOMException("Download canceled.", "AbortError"));
}

async function downloadImages(
	targetImages: GalleryDownloadImage[],
	emptyMessage: string,
	galleryName = data.gallery.name,
) {
	const plan = createGalleryDownloadPlan({
		images: targetImages,
		emptyMessage,
		galleryName,
		token: data.token,
		workerUrl: data.workerUrl,
	});

	if (plan.type === "empty") {
		showDownloadError(plan.message);
		return;
	}

	downloading = true;
	downloadError = null;
	try {
		const route = chooseGalleryDownloadRoute({
			chooseLocation: chooseDownloadFolder,
			folderDownloadsSupported,
			planType: plan.type,
			targetCount: targetImages.length,
			zipFileDownloadsSupported,
		});

		if (route === "folder") {
			await saveImagesToFolder(targetImages);
		} else if (route === "browserZip") {
			await saveImagesToZip(targetImages, galleryName);
		} else if (route === "preparedZip" && plan.type === "tooLarge") {
			await savePreparedZip(plan, galleryName);
		} else if (plan.type === "single") {
			triggerDownload(plan.image);
		} else if (plan.type === "zip") {
			submitZipDownload(plan);
		}
	} catch (error) {
		if (isPickerAbort(error)) {
			const statusToken = setFolderDownloadStatus("download canceled.");
			clearFolderDownloadStatusLater(statusToken, 3000);
		} else {
			setFolderDownloadStatus(null);
			showDownloadError("download failed. please try again.", 6000);
		}
	} finally {
		window.setTimeout(() => {
			downloading = false;
		}, 1500);
	}
}

function downloadAll() {
	return downloadImages(images, "no photographs are available to download yet.");
}

function downloadSelected() {
	return downloadImages(selectedImages, "no photographs selected.");
}

function downloadFavorites() {
	return downloadImages(
		images.filter((img) => img.isFavorite),
		"no favorite photographs selected.",
		`${data.gallery.name}-favorites`,
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
					{folderDownloadInProgress ? "saving…" : downloading ? "starting…" : "download all"}
				</button>
				<button
					type="button"
					class="ghost-btn muted"
					onclick={downloadSelected}
					disabled={downloading || selectedCount === 0}
				>
					download selected · {selectedCount}
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
				<button
					type="button"
					class="ghost-btn subtle"
					onclick={allImagesSelected ? clearSelection : selectAllImages}
					disabled={downloading || images.length === 0}
				>
					{allImagesSelected ? "clear selection" : "select all"}
				</button>
				<label class="folder-download-toggle" aria-disabled={!chosenLocationDownloadsSupported}>
					<input
						type="checkbox"
						bind:checked={chooseDownloadFolder}
						disabled={!chosenLocationDownloadsSupported || downloading}
					/>
					<span>choose location</span>
				</label>
				{#if folderDownloadInProgress}
					<button
						type="button"
						class="ghost-btn danger"
						onclick={cancelFolderDownload}
					>
						cancel download
					</button>
				{/if}
			</div>
		{/if}

		{#if folderDownloadStatus}
			<p class="download-status" role="status">{folderDownloadStatus}</p>
		{:else if data.gallery.downloadEnabled && !chosenLocationDownloadsSupported}
			<p class="download-status subtle">chosen-location downloads require a chromium browser.</p>
		{/if}

		{#if downloadError}
			<p class="error-note" role="alert">{downloadError}</p>
		{/if}
		<div class="view-toggle" aria-label="gallery view">
			<button
				type="button"
				class:active={galleryView === "grid"}
				aria-pressed={galleryView === "grid"}
				onclick={() => {
					galleryView = "grid";
				}}
			>
				grid
			</button>
			<button
				type="button"
				class:active={galleryView === "list"}
				aria-pressed={galleryView === "list"}
				onclick={() => {
					galleryView = "list";
				}}
			>
				list
			</button>
		</div>
	</header>

	{#if galleryView === "grid"}
		<div class="image-grid">
			{#each images as image, i (image._id)}
				<div class="grid-cell">
					<button
						type="button"
						class="thumb-btn"
						onclick={() => openLightbox(i)}
						aria-label="view photograph {i + 1} of {images.length}"
					>
						{#if image.canPreview}
							<img
								src={image.thumbUrl}
								alt="photograph {i + 1}: {image.filename}"
								loading="lazy"
							/>
						{:else}
							<span class="file-tile" aria-label={image.filename}>
								<span>{image.fileLabel}</span>
							</span>
						{/if}
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
					{#if data.gallery.downloadEnabled}
						<label
							class="select-photo"
							class:selected={selectedImageIds.has(image._id)}
							aria-label={"select " + image.filename}
						>
							<input
								type="checkbox"
								checked={selectedImageIds.has(image._id)}
								onchange={() => toggleImageSelection(image._id)}
							/>
							<span aria-hidden="true"></span>
						</label>
					{/if}
					<p class="image-filename">{image.filename}</p>
				</div>
			{/each}
		</div>
	{:else}
		<div class="image-list">
			{#each images as image, i (image._id)}
				<div class="list-row">
					<button
						type="button"
						class="list-thumb"
						onclick={() => openLightbox(i)}
						aria-label={"view " + image.filename}
					>
						{#if image.canPreview}
							<img src={image.thumbUrl} alt="" loading="lazy" />
						{:else}
							<span class="file-tile" aria-label={image.filename}>
								<span>{image.fileLabel}</span>
							</span>
						{/if}
					</button>
					<button type="button" class="list-info" onclick={() => openLightbox(i)}>
						<span class="list-filename">{image.filename}</span>
						<span class="list-meta">{image.fileLabel}</span>
					</button>
					<div class="list-actions">
						{#if data.gallery.favoritesEnabled}
							<button
								type="button"
								class="list-fav"
								class:is-fav={image.isFavorite}
								onclick={() => toggleFavorite(i)}
								aria-label={image.isFavorite ? "remove from favorites" : "add to favorites"}
							>
								{image.isFavorite ? "♥" : "♡"}
							</button>
						{/if}
						{#if data.gallery.downloadEnabled}
							<label class="list-select" aria-label={"select " + image.filename}>
								<input
									type="checkbox"
									checked={selectedImageIds.has(image._id)}
									onchange={() => toggleImageSelection(image._id)}
								/>
								<span>select</span>
							</label>
						{/if}
					</div>
				</div>
			{/each}
		</div>
	{/if}

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
			{#if images[lightboxIndex].canPreview}
				<img
					src={images[lightboxIndex].previewUrl}
					alt={images[lightboxIndex].filename}
					class="lightbox-image"
				/>
			{:else}
				<div class="lightbox-file">
					<span>{images[lightboxIndex].fileLabel}</span>
				</div>
			{/if}
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

	.ghost-btn.subtle {
		color: rgba(var(--paper-rgb), 0.48);
		border-color: rgba(var(--paper-rgb), 0.16);
	}

	.ghost-btn.danger {
		color: rgba(255, 128, 128, 0.9);
		border-color: rgba(255, 128, 128, 0.45);
	}

	.folder-download-toggle {
		display: inline-flex;
		align-items: center;
		gap: 0.45rem;
		min-height: 44px;
		font-family: var(--font-serif);
		font-size: 0.78rem;
		font-style: italic;
		letter-spacing: 0.08em;
		color: rgba(var(--paper-rgb), 0.58);
		cursor: pointer;
	}

	.folder-download-toggle[aria-disabled="true"] {
		cursor: not-allowed;
		color: rgba(var(--paper-rgb), 0.34);
	}

	.folder-download-toggle input {
		width: 0.9rem;
		height: 0.9rem;
		accent-color: rgba(var(--paper-rgb), 0.9);
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

	.download-status {
		font-family: var(--font-serif);
		font-size: 0.82rem;
		font-style: italic;
		letter-spacing: 0.05em;
		color: rgba(var(--paper-rgb), 0.58);
		margin: 1rem 0 0;
	}

	.download-status.subtle {
		color: rgba(var(--paper-rgb), 0.38);
	}

	.view-toggle {
		display: inline-flex;
		gap: 0.25rem;
		margin-top: 1rem;
		border: 1px solid rgba(var(--paper-rgb), 0.16);
		border-radius: 999px;
		padding: 0.25rem;
	}

	.view-toggle button {
		border: none;
		background: transparent;
		color: rgba(var(--paper-rgb), 0.52);
		font-family: var(--font-sans);
		font-size: 0.76rem;
		letter-spacing: 0.07em;
		padding: 0.35rem 0.85rem;
		border-radius: 999px;
		cursor: pointer;
	}

	.view-toggle button.active {
		background: rgba(var(--paper-rgb), 0.1);
		color: rgba(var(--paper-rgb), 0.92);
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
		border-radius: 2px;
	}

	.thumb-btn {
		display: block;
		width: 100%;
		aspect-ratio: 1;
		padding: 0;
		border: none;
		background: none;
		cursor: pointer;
		overflow: hidden;
		border-radius: 2px;
		background: rgba(var(--ink-rgb), 0.35);
	}

	.thumb-btn img {
		width: 100%;
		height: 100%;
		object-fit: cover;
		display: block;
		opacity: 0.92;
	}

	.file-tile {
		width: 100%;
		height: 100%;
		display: flex;
		align-items: center;
		justify-content: center;
		background: rgba(var(--paper-rgb), 0.08);
		color: rgba(var(--paper-rgb), 0.7);
	}

	.file-tile span {
		padding: 0.45rem 0.8rem;
		border: 1px solid rgba(var(--paper-rgb), 0.24);
		border-radius: 999px;
		font-size: 0.72rem;
		letter-spacing: 0.14em;
		text-transform: uppercase;
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

	.image-filename {
		margin: 0.5rem 0 0;
		font-size: 0.72rem;
		line-height: 1.3;
		color: rgba(var(--paper-rgb), 0.54);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
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

	.select-photo {
		position: absolute;
		top: 0.6rem;
		left: 0.6rem;
		width: 36px;
		height: 36px;
		border-radius: 50%;
		border: 1px solid rgba(var(--paper-rgb), 0.25);
		background: rgba(var(--ink-rgb), 0.55);
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
		opacity: 0;
		transition:
			opacity 300ms ease,
			background 300ms ease,
			border-color 300ms ease;
	}

	.grid-cell:hover .select-photo,
	.grid-cell:focus-within .select-photo,
	.select-photo.selected {
		opacity: 1;
	}

	.select-photo:hover,
	.select-photo.selected {
		background: rgba(var(--ink-rgb), 0.75);
		border-color: rgba(var(--paper-rgb), 0.55);
	}

	.select-photo input {
		position: absolute;
		opacity: 0;
		pointer-events: none;
	}

	.select-photo span {
		width: 15px;
		height: 15px;
		border: 1px solid rgba(var(--paper-rgb), 0.7);
		border-radius: 2px;
		background: rgba(var(--paper-rgb), 0.08);
	}

	.select-photo.selected span {
		background: rgba(var(--paper-rgb), 0.9);
		border-color: rgba(var(--paper-rgb), 0.95);
		box-shadow: inset 0 0 0 3px rgba(var(--ink-rgb), 0.72);
	}

	.image-list {
		display: flex;
		flex-direction: column;
		border-top: 1px solid rgba(var(--paper-rgb), 0.12);
	}

	.list-row {
		display: grid;
		grid-template-columns: 68px minmax(0, 1fr) auto;
		gap: 1rem;
		align-items: center;
		padding: 0.75rem 0;
		border-bottom: 1px solid rgba(var(--paper-rgb), 0.12);
	}

	.list-thumb {
		width: 68px;
		aspect-ratio: 1;
		border: none;
		border-radius: 2px;
		padding: 0;
		overflow: hidden;
		background: rgba(var(--ink-rgb), 0.35);
		cursor: pointer;
	}

	.list-thumb img {
		width: 100%;
		height: 100%;
		object-fit: cover;
		display: block;
	}

	.list-info {
		min-width: 0;
		border: none;
		background: transparent;
		color: inherit;
		font-family: var(--font-sans);
		text-align: left;
		cursor: pointer;
	}

	.list-filename,
	.list-meta {
		display: block;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.list-filename {
		color: rgba(var(--paper-rgb), 0.84);
	}

	.list-meta {
		margin-top: 0.25rem;
		color: rgba(var(--paper-rgb), 0.42);
		font-size: 0.72rem;
		letter-spacing: 0.14em;
		text-transform: uppercase;
	}

	.list-actions {
		display: flex;
		align-items: center;
		gap: 1rem;
	}

	.list-fav {
		border: none;
		background: transparent;
		color: rgba(var(--paper-rgb), 0.48);
		font-family: var(--font-serif);
		font-size: 1rem;
		cursor: pointer;
	}

	.list-fav.is-fav {
		color: rgba(var(--paper-rgb), 0.95);
	}

	.list-select {
		display: flex;
		align-items: center;
		gap: 0.45rem;
		color: rgba(var(--paper-rgb), 0.58);
		font-family: var(--font-sans);
		font-size: 0.76rem;
		letter-spacing: 0.05em;
		cursor: pointer;
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

	.lightbox-file {
		width: min(520px, 80vw);
		aspect-ratio: 4 / 3;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: 2px;
		background: rgba(var(--paper-rgb), 0.08);
		color: rgba(var(--paper-rgb), 0.72);
		box-shadow: 0 8px 40px rgba(0, 0, 0, 0.5);
	}

	.lightbox-file span {
		padding: 0.5rem 0.9rem;
		border: 1px solid rgba(var(--paper-rgb), 0.24);
		border-radius: 999px;
		font-size: 0.75rem;
		letter-spacing: 0.14em;
		text-transform: uppercase;
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
		.list-row {
			grid-template-columns: 54px minmax(0, 1fr);
		}
		.list-thumb {
			width: 54px;
		}
		.list-actions {
			grid-column: 2;
			justify-content: space-between;
		}
		.fav-btn {
			opacity: 1;
		}
		.select-photo {
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
