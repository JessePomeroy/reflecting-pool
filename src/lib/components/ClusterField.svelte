<script lang="ts">
import { getContext, onMount } from "svelte";
import { browser } from "$app/environment";
import type { GalleryCluster, ParallaxContext } from "$lib/types/gallery";
import { clamp, distance, generateClusterPositions, randomRange } from "$lib/utils/math";
import PhotoCard from "./PhotoCard.svelte";

interface Props {
	clusters: GalleryCluster[];
	onclusterclick: (cluster: GalleryCluster) => void;
	dismissing?: boolean;
	dismissOriginX?: number;
	dismissOriginY?: number;
}

let {
	clusters,
	onclusterclick,
	dismissing = false,
	dismissOriginX = 50,
	dismissOriginY = 50,
}: Props = $props();

const parallax = getContext<ParallaxContext>("parallax");

// Generate cluster positions dynamically
let positions = $state<Array<{ x: number; y: number }>>([]);
let clusterDepths = $state<number[]>([]);

// Wander state — pre-allocated, mutated in place
let wanderOffsets = $state.raw<Array<{ x: number; y: number }>>([]);
let wanderFreqs: Array<{ fx: number; fy: number; px: number; py: number }> = [];
let prefersReducedMotion = $state(false);

onMount(() => {
	if (!browser) return;

	// Generate positions based on cluster count
	positions = generateClusterPositions(clusters.length);

	// Assign depths — further from center = deeper
	clusterDepths = positions.map((pos) => {
		const distFromCenter = distance(pos.x, pos.y, 50, 55);
		return clamp(0.3 + distFromCenter * 0.012, 0.3, 0.8);
	});

	// Initialize wander
	wanderOffsets = clusters.map(() => ({ x: 0, y: 0 }));
	wanderFreqs = clusters.map(() => ({
		fx: randomRange(0.0003, 0.0008),
		fy: randomRange(0.0003, 0.0008),
		px: randomRange(0, Math.PI * 2),
		py: randomRange(0, Math.PI * 2),
	}));

	// Check for reduced motion preference
	prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
});

// Wander is driven by the parallax tick
let wanderComputed = $derived.by(() => {
	const _tick = parallax.tick; // dependency
	if (!wanderFreqs.length) return wanderOffsets;

	// Skip sine-wave wander when reduced motion is preferred
	if (prefersReducedMotion) {
		return clusters.map(() => ({ x: 0, y: 0 }));
	}

	const now = performance.now();
	const amplitude = parallax.isMobile ? 5 : 15;

	const newOffsets = new Array(clusters.length);
	for (let i = 0; i < clusters.length; i++) {
		const f = wanderFreqs[i];
		newOffsets[i] = {
			x: Math.sin(now * f.fx + f.px) * amplitude,
			y: Math.sin(now * f.fy + f.py) * amplitude,
		};
	}

	return newOffsets;
});

// ── Ripple push state ─────────────────────────────────────────────
let ripplePush = $state<Array<{ x: number; y: number }>>([]); // per-cluster push offset
let rippleDecay: Array<{ x: number; y: number }> = []; // velocity for spring-back

onMount(() => {
	if (!browser) return;

	ripplePush = clusters.map(() => ({ x: 0, y: 0 }));
	rippleDecay = clusters.map(() => ({ x: 0, y: 0 }));

	// Click anywhere to ripple clusters
	function handlePageClick(e: MouseEvent) {
		const clickX = (e.clientX / window.innerWidth) * 100;
		const clickY = (e.clientY / window.innerHeight) * 100;

		for (let i = 0; i < positions.length; i++) {
			const pos = positions[i];
			if (!pos) continue;
			const dx = pos.x - clickX;
			const dy = pos.y - clickY;
			const dist = Math.sqrt(dx * dx + dy * dy);
			const maxDist = 35; // % of viewport
			if (dist > maxDist || dist < 0.5) continue;

			const strength = (1 - dist / maxDist) * 25; // px push
			const angle = Math.atan2(dy, dx);
			rippleDecay[i] = {
				x: Math.cos(angle) * strength,
				y: Math.sin(angle) * strength,
			};
		}
	}

	window.addEventListener('click', handlePageClick);

	return () => window.removeEventListener('click', handlePageClick);
});

// Spring-back animation tied to parallax tick
let rippleComputed = $derived.by(() => {
	const _tick = parallax.tick;
	if (!rippleDecay.length) return ripplePush;

	const damping = 0.9;
	const spring = 0.08;

	for (let i = 0; i < rippleDecay.length; i++) {
		// Apply velocity
		if (ripplePush[i]) {
			ripplePush[i].x += rippleDecay[i].x;
			ripplePush[i].y += rippleDecay[i].y;

			// Spring back toward 0
			rippleDecay[i].x = rippleDecay[i].x * damping - ripplePush[i].x * spring;
			rippleDecay[i].y = rippleDecay[i].y * damping - ripplePush[i].y * spring;
		}
	}

	return [...ripplePush];
});

function handleClusterClick(cluster: GalleryCluster) {
	onclusterclick(cluster);
}
</script>

<div class="cluster-field" class:dismissing>
	{#each clusters as cluster, i}
		{@const pos = positions[i]}
		{@const depth = clusterDepths[i] ?? 0.5}
		{@const wander = wanderComputed[i] ?? { x: 0, y: 0 }}
		{@const ripple = rippleComputed[i] ?? { x: 0, y: 0 }}
		{@const pxOffset = parallax.smoothX * depth * 20}
		{@const pyOffset = parallax.smoothY * depth * 20}
		{#if pos}
			<!-- svelte-ignore a11y_click_events_have_key_events -->
			<!-- svelte-ignore a11y_no_static_element_interactions -->
			<div
				class="cluster"
				class:dismiss={dismissing}
				style:left="{pos.x}%"
				style:top="{pos.y}%"
				style:--cx="{wander.x + pxOffset + ripple.x}px"
				style:--cy="{wander.y + pyOffset + ripple.y}px"
				style:--dismiss-x="{(pos.x - dismissOriginX) * 3}vw"
				style:--dismiss-y="{(pos.y - dismissOriginY) * 3}vh"
				style:z-index={Math.round(depth * 10)}
				onclick={() => handleClusterClick(cluster)}
			>
				<h3 class="cluster-title">{cluster.title}</h3>
				<div class="cluster-images">
					{#each cluster.images.slice(0, 4) as img, j}
						<div
							class="cluster-thumb"
							style:--ox="{img.offsetX}px"
							style:--oy="{img.offsetY}px"
							style:--rot="{img.rotation}deg"
							style:--s={img.scale}
							style:z-index={j}
						>
							<img src={img.src} alt={img.alt} loading="lazy" draggable="false" />
						</div>
					{/each}
				</div>
			</div>
		{/if}
	{/each}
</div>

<style>
	.cluster-field {
		position: fixed;
		inset: 0;
		z-index: 1;
		pointer-events: none;
	}

	.cluster {
		position: absolute;
		transform: translate(calc(-50% + var(--cx, 0px)), calc(-50% + var(--cy, 0px)));
		cursor: pointer;
		pointer-events: auto;
		transition: opacity 600ms ease;
	}

	.cluster.dismiss {
		transform: translate(
			calc(-50% + var(--cx, 0px) + var(--dismiss-x, 0)),
			calc(-50% + var(--cy, 0px) + var(--dismiss-y, 0))
		);
		opacity: 0;
		transition:
			transform 800ms ease-in,
			opacity 800ms ease-in;
		pointer-events: none;
	}

	.cluster-title {
		font-family: 'Cormorant', serif;
		font-weight: 300;
		font-size: clamp(0.8rem, 1.2vw, 1rem);
		color: rgba(240, 244, 248, 0.4);
		letter-spacing: 0.2em;
		text-align: center;
		margin: 0 0 0.6rem;
		text-transform: lowercase;
		white-space: nowrap;
	}

	.cluster-images {
		position: relative;
		width: clamp(140px, 20vw, 220px);
		height: clamp(110px, 15vw, 170px);
	}

	.cluster-thumb {
		position: absolute;
		left: 50%;
		top: 50%;
		width: clamp(80px, 12vw, 130px);
		transform: translate(calc(-50% + var(--ox, 0px)), calc(-50% + var(--oy, 0px)))
			rotate(var(--rot, 0deg)) scale(var(--s, 1));
		border-radius: 2px;
		overflow: hidden;
		box-shadow: 0 3px 12px rgba(0, 0, 0, 0.25);
		transition: transform 400ms ease;
	}

	.cluster-thumb img {
		display: block;
		width: 100%;
		height: auto;
		aspect-ratio: 4/3;
		object-fit: cover;
		pointer-events: none;
	}

	.cluster:hover .cluster-title {
		color: rgba(240, 244, 248, 0.7);
	}

	.cluster:hover .cluster-thumb {
		box-shadow: 0 5px 20px rgba(0, 0, 0, 0.35);
	}

	.dismissing {
		pointer-events: none;
	}

	@media (max-width: 767px) {
		.cluster-field {
			position: relative;
			display: flex;
			flex-direction: column;
			align-items: center;
			gap: 3rem;
			padding: 2rem 1rem 4rem;
		}

		.cluster {
			position: relative;
			left: auto !important;
			top: auto !important;
			transform: none;
		}

		.cluster.dismiss {
			transform: translateY(30px);
		}
	}
</style>
