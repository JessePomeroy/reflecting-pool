<script lang="ts">
import { getContext, onMount } from "svelte";
import { browser } from "$app/environment";
import type { ClusterImage, GalleryCluster, ParallaxContext } from "$lib/types/gallery";
import { generateScatteredPositions, randomRange } from "$lib/utils/math";
import PhotoCard from "./PhotoCard.svelte";

interface Props {
	cluster: GalleryCluster;
	onback: () => void;
	onlightbox: (src: string, index: number, images: ClusterImage[]) => void;
}

let { cluster, onback, onlightbox }: Props = $props();

const parallax = getContext<ParallaxContext>("parallax");

// Generate scattered positions for all images in this gallery
let imagePositions = $state<Array<{ x: number; y: number }>>([]);
let imageDepths = $state<number[]>([]);
let imageRotations = $state<number[]>([]);
let revealed = $state(false);

onMount(() => {
	if (!browser) return;

	const isMobile = window.innerWidth < 768;
	const count = cluster.images.length;

	if (isMobile) {
		// 2-column staggered layout
		imagePositions = cluster.images.map((_, i) => ({
			x: i % 2 === 0 ? 10 : 50,
			y: 35 + Math.floor(i / 2) * 22 + (i % 2 === 0 ? 0 : 8),
		}));
	} else {
		imagePositions = generateScatteredPositions(
			count,
			{
				minX: 5,
				maxX: 85,
				minY: 32,
				maxY: 82,
			},
			12,
		);
	}

	imageDepths = cluster.images.map(() => randomRange(0.3, 0.9));
	imageRotations = cluster.images.map(() => randomRange(-3, 3));

	// Staggered reveal
	requestAnimationFrame(() => {
		revealed = true;
	});
});
</script>

<div class="gallery-view" class:revealed>
	<button class="back-button" onclick={onback}>
		<span class="back-arrow">←</span>
		<span class="back-text">back</span>
	</button>

	<h2 class="gallery-title">{cluster.title}</h2>

	<div class="gallery-images">
		{#each cluster.images as img, i}
			{@const pos = imagePositions[i]}
			{@const depth = imageDepths[i] ?? 0.5}
			{@const rot = imageRotations[i] ?? 0}
			{#if pos}
				<div
					class="gallery-photo"
					class:revealed
					style:left="{pos.x}%"
					style:top="{pos.y}%"
					style:transition-delay="{i * 80}ms"
					style:width="clamp(120px, 22vw, 260px)"
				>
					<PhotoCard
						src={img.src}
						alt={img.alt}
						depth={depth}
						rotation={rot}
						floatDuration={randomRange(3, 6)}
						driftDuration={randomRange(20, 40)}
						onclick={() => onlightbox(img.src, i, cluster.images)}
					/>
				</div>
			{/if}
		{/each}
	</div>
</div>

<style>
	.gallery-view {
		position: fixed;
		inset: 0;
		z-index: 1;
		overflow-y: auto;
	}

	.back-button {
		position: fixed;
		top: 35%;
		left: 2rem;
		z-index: 20;
		background: none;
		border: none;
		cursor: pointer;
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-family: 'Cormorant', serif;
		font-size: 1.1rem;
		color: transparent;
		-webkit-text-stroke: 1px rgba(240, 244, 248, 0.85);
		letter-spacing: 0.1em;
		transition: all 300ms ease;
		padding: 0.5rem;
	}

	.back-button:hover {
		-webkit-text-stroke: 1px rgba(240, 244, 248, 1);
	}

	.back-arrow {
		font-size: 1.2rem;
	}

	.gallery-title {
		position: fixed;
		top: 33%;
		left: 50%;
		transform: translateX(-50%);
		z-index: 50;
		font-family: 'Cormorant', serif;
		font-weight: 300;
		font-size: clamp(1.2rem, 2.5vw, 1.8rem);
		color: transparent;
		-webkit-text-stroke: 1px rgba(240, 244, 248, 0.85);
		letter-spacing: 0.25em;
		text-transform: lowercase;
		margin: 0;
		white-space: nowrap;
	}

	.gallery-images {
		position: relative;
		width: 100%;
		min-height: 100vh;
	}

	.gallery-photo {
		position: absolute;
		opacity: 0;
		transform: translateY(30px) scale(0.9);
		transition:
			opacity 600ms ease-out,
			transform 600ms ease-out;
	}

	.gallery-photo.revealed {
		opacity: 1;
		transform: translateY(0) scale(1);
	}

	@media (max-width: 767px) {
		.gallery-images {
			position: relative;
			display: block;
			padding: 0 1rem;
		}

		.gallery-photo {
			position: relative !important;
			left: auto !important;
			top: auto !important;
			width: 45% !important;
			display: inline-block;
			margin-bottom: 1rem;
		}
	}
</style>
