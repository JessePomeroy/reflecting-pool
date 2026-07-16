<script lang="ts">
import ClusterField from "$lib/components/ClusterField.svelte";
import GalleryView from "$lib/components/GalleryView.svelte";
import LeafLayer from "$lib/components/LeafLayer.svelte";
import Lightbox from "$lib/components/Lightbox.svelte";
import Navigation from "$lib/components/Navigation.svelte";
import StrokeTitle from "$lib/components/StrokeTitle.svelte";
import WaterSurface from "$lib/components/WaterSurface.svelte";
import type { ClusterImage, GalleryCluster } from "$lib/types/gallery";

let { clusters }: { clusters: GalleryCluster[] } = $props();

type View = "index" | "gallery";

let view = $state<View>("index");
let activeCluster = $state<GalleryCluster | null>(null);

let dismissing = $state(false);
let dismissOriginX = $state(50);
let dismissOriginY = $state(50);

let lightboxOpen = $state(false);
let lightboxSrc = $state("");
let lightboxIndex = $state(0);
let lightboxImages = $state<ClusterImage[]>([]);

function handleClusterClick(cluster: GalleryCluster) {
	if (dismissing) return;

	dismissOriginX = 50;
	dismissOriginY = 55;

	activeCluster = cluster;
	dismissing = true;

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

<WaterSurface />

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

<LeafLayer hidden={lightboxOpen} />

<header class="site-header">
	<div class="header-left">
		<a class="home-link" href="/" aria-label="Home">
			<StrokeTitle />
		</a>
	</div>
	<div class="header-right">
		<Navigation />
	</div>
</header>

{#if lightboxOpen}
	<Lightbox
		src={lightboxSrc}
		currentIndex={lightboxIndex}
		images={lightboxImages}
		onclose={closeLightbox}
	/>
{/if}

<style>
	.site-header {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		z-index: 15;
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		padding: 1.5rem 2.5rem;
		pointer-events: none;
	}

	.header-left,
	.header-right {
		pointer-events: auto;
	}

	.header-right {
		padding-top: 3.5rem;
	}

	.home-link {
		display: block;
		color: inherit;
		text-decoration: none;
	}

	:global(.site-header .title) {
		max-width: none;
		white-space: nowrap;
	}

	@media (max-width: 767px) {
		.site-header {
			padding: 1rem 1.2rem;
		}
	}
</style>
