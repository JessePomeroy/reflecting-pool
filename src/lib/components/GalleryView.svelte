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
let focusedIndex = $state(0); // which image is closest to viewport center (mobile)

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

	// Scroll-driven focus — update which image is closest to viewport center
	if (window.innerWidth < 768) {
		const scrollEl = document.querySelector(".gallery-view") as HTMLElement;
		if (scrollEl) {
			function updateFocus() {
				const midY = window.innerHeight / 2;
				const photos = scrollEl.querySelectorAll(".gallery-photo");
				let closestIdx = 0;
				let closestDist = Infinity;
				photos.forEach((el, i) => {
					const rect = el.getBoundingClientRect();
					const elMidY = rect.top + rect.height / 2;
					const dist = Math.abs(elMidY - midY);
					if (dist < closestDist) {
						closestDist = dist;
						closestIdx = i;
					}
				});
				focusedIndex = closestIdx;
			}

			scrollEl.addEventListener("scroll", updateFocus, { passive: true });
			updateFocus(); // initial check
			return () => scrollEl.removeEventListener("scroll", updateFocus);
		}
	}
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
					class:focused={i === focusedIndex}
					style:left="{pos.x}%"
					style:top="{pos.y}%"
					style:transition-delay="{i * 80}ms"
					style:width="clamp(120px, 22vw, 260px)"
					style:z-index={i === focusedIndex ? 50 : Math.round(depth * 10)}
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
		font-family: var(--font-serif);
		font-size: 1.1rem;
		color: transparent;
		-webkit-text-stroke: 1px rgba(var(--paper-rgb), 0.6);
		letter-spacing: 0.1em;
		transition: all 300ms ease;
		padding: 0.5rem;
	}

	.back-button:hover {
		-webkit-text-stroke: 1px rgba(var(--paper-rgb), 1);
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
		font-family: var(--font-serif);
		font-weight: 300;
		font-size: clamp(1.2rem, 2.5vw, 1.8rem);
		color: transparent;
		-webkit-text-stroke: 1px rgba(var(--paper-rgb), 0.6);
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
		.gallery-view {
			overflow-y: auto;
			overflow-x: hidden;
		}

		.gallery-images {
			position: relative;
			display: flex;
			flex-direction: column;
			align-items: center;
			gap: 8rem;
			padding: 28vh 1rem 6rem;
		}

		.gallery-photo {
			position: relative !important;
			left: auto !important;
			top: auto !important;
			width: clamp(200px, 70vw, 300px) !important;
			flex-shrink: 0;
			transform: none !important;
			transition: transform 400ms ease, box-shadow 400ms ease;
		}

		.gallery-photo.focused {
			transform: scale(1.06) !important;
			filter: drop-shadow(0 8px 24px rgba(0,0,0,0.4));
		}

		/* Back + title on same line at bottom */
		.back-button {
			top: auto;
			bottom: 1.5rem;
			left: 1.5rem;
			padding: 0;
		}

		.gallery-title {
			top: auto;
			bottom: 1.65rem;
			left: auto;
			right: 1.5rem;
			transform: none;
			line-height: 1;
		}
	}
</style>
