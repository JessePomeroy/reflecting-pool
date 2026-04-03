<script lang="ts">
import { getContext } from "svelte";
import type { ParallaxContext } from "$lib/types/gallery";

const parallax = getContext<ParallaxContext>("parallax");

// Ripple state — CSS-only expanding circles
let ripples = $state<Array<{ id: number; x: number; y: number }>>([]);
let nextId = 0;

function handleClick(e: MouseEvent) {
	nextId++;
	const id = nextId;
	ripples = [...ripples, { id, x: e.clientX, y: e.clientY }];

	// Also notify parallax context
	parallax.addRipple(e.clientX, e.clientY);

	// Clean up after animation
	setTimeout(() => {
		ripples = ripples.filter((r) => r.id !== id);
	}, 1200);
}
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="water-surface" onclick={handleClick}>
	<!-- Caustics placeholder — ready for a video to be dropped in -->
	<div class="caustics-layer"></div>

	<!-- Ripple rings -->
	{#each ripples as ripple (ripple.id)}
		<div
			class="ripple-ring"
			style:left="{ripple.x}px"
			style:top="{ripple.y}px"
		></div>
		<div
			class="ripple-ring ring-2"
			style:left="{ripple.x}px"
			style:top="{ripple.y}px"
		></div>
	{/each}
</div>

<style>
	.water-surface {
		position: fixed;
		inset: 0;
		z-index: 0;
		pointer-events: auto;
		overflow: hidden;
	}

	/* Caustics placeholder — add a <video> or background-image later */
	.caustics-layer {
		position: absolute;
		inset: 0;
		mix-blend-mode: soft-light;
		opacity: 0.04;
		pointer-events: none;
		/* Subtle CSS caustics approximation */
		background:
			radial-gradient(ellipse at 20% 50%, rgba(255, 255, 255, 0.5) 0%, transparent 50%),
			radial-gradient(ellipse at 80% 20%, rgba(255, 255, 255, 0.3) 0%, transparent 50%),
			radial-gradient(ellipse at 50% 80%, rgba(255, 255, 255, 0.4) 0%, transparent 50%);
	}

	/* Ripple ring — CSS-only expanding circle */
	.ripple-ring {
		position: fixed;
		width: 10px;
		height: 10px;
		border-radius: 50%;
		border: 1px solid rgba(240, 244, 248, 0.2);
		pointer-events: none;
		transform: translate(-50%, -50%) scale(0);
	}

	.ripple-ring.ring-2 {
		border-color: rgba(240, 244, 248, 0.12);
	}

	@keyframes ripple-expand {
		0% {
			transform: translate(-50%, -50%) scale(0);
			opacity: 0.5;
		}
		100% {
			transform: translate(-50%, -50%) scale(40);
			opacity: 0;
		}
	}

	@keyframes caustics-drift {
		0% {
			transform: scale(1) rotate(0deg);
		}
		50% {
			transform: scale(1.1) rotate(2deg);
		}
		100% {
			transform: scale(0.95) rotate(-1deg);
		}
	}

	@media (prefers-reduced-motion: no-preference) {
		.caustics-layer {
			animation: caustics-drift 15s ease-in-out infinite alternate;
		}
		.ripple-ring {
			animation: ripple-expand 1000ms ease-out forwards;
		}
		.ripple-ring.ring-2 {
			animation-delay: 150ms;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.caustics-layer {
			animation: none;
		}
	}
</style>
