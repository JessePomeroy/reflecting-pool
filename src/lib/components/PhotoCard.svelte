<script lang="ts">
import { getContext } from "svelte";
import type { ParallaxContext } from "$lib/types/gallery";

interface Props {
	src: string;
	alt?: string;
	depth?: number;
	rotation?: number;
	scale?: number;
	floatDuration?: number;
	driftDuration?: number;
	onclick?: (e: MouseEvent) => void;
}

let {
	src,
	alt = "",
	depth = 0.5,
	rotation = 0,
	scale = 1,
	floatDuration = 4,
	driftDuration = 30,
	onclick,
}: Props = $props();

const parallax = getContext<ParallaxContext>("parallax");

// Max parallax shift in pixels — deeper images move more
const MAX_SHIFT = 25;

let cardEl: HTMLElement | undefined = $state();

// Compute parallax offset via CSS custom properties
// JS writes custom properties, CSS reads them in calc() — NEVER touch transform directly from JS
let parallaxX = $derived(parallax.smoothX * depth * MAX_SHIFT);
let parallaxY = $derived(parallax.smoothY * depth * MAX_SHIFT);

// Depth-based visual effects
let depthScale = $derived(0.85 + depth * 0.15);
let depthBlur = $derived(depth < 0.3 ? (0.3 - depth) * 4 : 0);
let depthOpacity = $derived(0.7 + depth * 0.3);

// Random delays for desynchronized animations (captured once at mount — intentional)
const floatDelay = Math.random() * -4;
const driftDelay = Math.random() * -30;
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
	class="photo-card"
	bind:this={cardEl}
	style:--parallax-x="{parallaxX}px"
	style:--parallax-y="{parallaxY}px"
	style:--depth-scale={depthScale * scale}
	style:--depth-blur="{depthBlur}px"
	style:--depth-opacity={depthOpacity}
	style:--float-duration="{floatDuration}s"
	style:--float-delay="{floatDelay}s"
	style:--drift-duration="{driftDuration}s"
	style:--drift-delay="{driftDelay}s"
	style:--rotation="{rotation}deg"
	style:z-index={Math.round(depth * 10)}
	onclick={onclick}
>
	<img {src} {alt} loading="lazy" decoding="async" draggable="false" />
</div>

<style>
	.photo-card {
		position: absolute;
		/* CSS reads JS-written custom properties — separation maintained */
		transform: translate(var(--parallax-x, 0px), var(--parallax-y, 0px))
			scale(var(--depth-scale, 1)) rotate(var(--rotation, 0deg));
		filter: blur(var(--depth-blur, 0px));
		opacity: var(--depth-opacity, 1);
		cursor: pointer;
		transition:
			filter 400ms ease,
			opacity 400ms ease;
	}

	.photo-card:hover {
		will-change: transform;
		filter: blur(0px) brightness(1.08);
		opacity: 1;
	}

	.photo-card img {
		display: block;
		width: 100%;
		height: 100%;
		object-fit: cover;
		border-radius: 2px;
		box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
		pointer-events: none;
	}

	@keyframes photo-float {
		0%,
		100% {
			translate: 0 0;
		}
		50% {
			translate: 0 -8px;
		}
	}

	@keyframes photo-drift {
		0% {
			margin-left: 0;
			margin-top: 0;
		}
		25% {
			margin-left: 3px;
			margin-top: -2px;
		}
		50% {
			margin-left: -2px;
			margin-top: 1px;
		}
		75% {
			margin-left: 1px;
			margin-top: 3px;
		}
		100% {
			margin-left: 0;
			margin-top: 0;
		}
	}

	@media (prefers-reduced-motion: no-preference) {
		.photo-card {
			animation:
				photo-float var(--float-duration, 4s) ease-in-out infinite var(--float-delay, 0s),
				photo-drift var(--drift-duration, 30s) ease-in-out infinite var(--drift-delay, 0s);
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.photo-card {
			animation: none;
		}
	}
</style>
