<script lang="ts">
import ClusterField from "$lib/components/ClusterField.svelte";
import GalleryView from "$lib/components/GalleryView.svelte";
import LeafLayer from "$lib/components/LeafLayer.svelte";
import Lightbox from "$lib/components/Lightbox.svelte";
import Navigation from "$lib/components/Navigation.svelte";
import ParallaxProvider from "$lib/components/ParallaxProvider.svelte";
import StrokeTitle from "$lib/components/StrokeTitle.svelte";
import WaterSurface from "$lib/components/WaterSurface.svelte";
import type { ClusterImage, GalleryCluster } from "$lib/types/gallery";

// ─── Gallery Data ──────────────────────────────────────────────
// 5 clusters, ~6-7 images each, from flower-01 to flower-35 (no 23)

function seededRandom(seed: number): () => number {
	let s = seed;
	return () => {
		s = (s * 16807 + 0) % 2147483647;
		return s / 2147483647;
	};
}

function makeImage(num: string, title: string): ClusterImage {
	const rand = seededRandom(parseInt(num, 10));
	return {
		src: `/images/flower-${num}.jpg`,
		alt: `${title} — flower ${num}`,
		depth: 0.25 + rand() * 0.65,
		offsetX: -38 + rand() * 76,
		offsetY: -28 + rand() * 56,
		rotation: -4.5 + rand() * 9,
		scale: 0.82 + rand() * 0.18,
	};
}

function makeCluster(id: string, title: string, slug: string, nums: string[]): GalleryCluster {
	return { id, title, slug, images: nums.map((n) => makeImage(n, title)) };
}

const clusters: GalleryCluster[] = [
	makeCluster("wildflowers", "Wildflowers", "wildflowers", [
		"01",
		"02",
		"03",
		"04",
		"05",
		"06",
		"07",
	]),
	makeCluster("garden-portraits", "Garden Portraits", "garden-portraits", [
		"08",
		"09",
		"10",
		"11",
		"12",
		"13",
	]),
	makeCluster("close-ups", "Close-ups", "close-ups", ["14", "15", "16", "17", "18", "19", "20"]),
	makeCluster("moody-blooms", "Moody Blooms", "moody-blooms", ["21", "22", "24", "25", "26", "27"]),
	makeCluster("panoramic", "Panoramic", "panoramic", [
		"28",
		"29",
		"30",
		"31",
		"32",
		"33",
		"34",
		"35",
	]),
];

// ─── View State ────────────────────────────────────────────────
type View = "index" | "gallery";

let view = $state<View>("index");
let activeCluster = $state<GalleryCluster | null>(null);

// Dismiss transition state
let dismissing = $state(false);
let dismissOriginX = $state(50);
let dismissOriginY = $state(50);

// Lightbox state
let lightboxOpen = $state(false);
let lightboxSrc = $state("");
let lightboxIndex = $state(0);
let lightboxImages = $state<ClusterImage[]>([]);

// ─── Event Handlers ────────────────────────────────────────────

function handleClusterClick(cluster: GalleryCluster) {
	if (dismissing) return;

	// Record click origin as percentage (approx center of screen)
	dismissOriginX = 50;
	dismissOriginY = 55;

	activeCluster = cluster;
	dismissing = true;

	// After dismiss animation completes, switch to gallery view
	setTimeout(() => {
		view = "gallery";
		dismissing = false;
	}, 700);
}

function handleBack() {
	if (view === "index") return;
	view = "index";
	activeCluster = null;
	dismissing = false;
}

function openLightbox(src: string, index: number, images: ClusterImage[]) {
	lightboxSrc = src;
	lightboxIndex = index;
	lightboxImages = images;
	lightboxOpen = true;
}

function closeLightbox() {
	lightboxOpen = false;
}
</script>

<ParallaxProvider>
	<!-- z-0: Water surface with ripple rings and caustics placeholder -->
	<WaterSurface />

	<!-- z-1 to z-8: Gallery area (clusters or expanded gallery) -->
	{#if view === 'index'}
		<ClusterField
			{clusters}
			onclusterclick={handleClusterClick}
			{dismissing}
			{dismissOriginX}
			{dismissOriginY}
		/>
	{:else if activeCluster}
		<GalleryView cluster={activeCluster} onback={handleBack} onlightbox={openLightbox} />
	{/if}

	<!-- z-3 to z-12: Floating leaves (behind and in front of gallery) -->
	<LeafLayer hidden={lightboxOpen} />

	<!-- z-15 to z-16: Fixed header with gradient, title, and nav -->
	<header class="site-header">
		<div class="header-content">
			<StrokeTitle />
			<Navigation />
		</div>
		<div class="header-blur"></div>
	</header>

	<!-- z-100: Lightbox -->
	{#if lightboxOpen}
		<Lightbox
			src={lightboxSrc}
			currentIndex={lightboxIndex}
			images={lightboxImages}
			onclose={closeLightbox}
		/>
	{/if}
</ParallaxProvider>

<style>
	/* ─── Header Zone ─────────────────────────────────────────── */
	.site-header {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		height: 33vh;
		background: #1a1f2e;
		z-index: 15;
		pointer-events: none;
	}

	.header-content {
		position: relative;
		z-index: 16;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		height: 67%;
		pointer-events: auto;
	}

	/* Bottom blur dissolve into gallery */
	.header-blur {
		position: absolute;
		bottom: 0;
		left: 0;
		right: 0;
		height: 40%;
		mask-image: linear-gradient(to bottom, black, transparent);
		-webkit-mask-image: linear-gradient(to bottom, black, transparent);
		backdrop-filter: blur(10px);
		pointer-events: none;
		animation: blur-breathe 6s ease-in-out infinite;
	}

	@keyframes blur-breathe {
		0%,
		100% {
			backdrop-filter: blur(10px);
		}
		50% {
			backdrop-filter: blur(14px);
		}
	}

	@media (max-width: 767px) {
		.site-header {
			height: 40vh;
		}

		.header-content {
			height: 65%;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.header-blur {
			animation: none;
		}
	}
</style>
