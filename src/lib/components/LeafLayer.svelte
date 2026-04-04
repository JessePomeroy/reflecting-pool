<script lang="ts">
import { getContext, onMount } from "svelte";
import { browser } from "$app/environment";
import type { FloatingLeaf, ParallaxContext } from "$lib/types/gallery";
import { clamp, randomRange } from "$lib/utils/math";

interface Props {
	hidden?: boolean;
}

let { hidden = false }: Props = $props();

const parallax = getContext<ParallaxContext>("parallax");

const LEAF_SRCS = [
	"/images/leaf1.png",
	"/images/leaf2.png",
	"/images/leaf3.png",
	"/images/leaf4.png",
	"/images/leaf5.png",
];

let leaves = $state<FloatingLeaf[]>([]);

onMount(() => {
	if (!browser) return;

	const count = parallax.isMobile ? 6 : 12;

	leaves = Array.from({ length: count }, (_, i) => ({
		id: i,
		src: LEAF_SRCS[i % LEAF_SRCS.length],
		x: randomRange(5, 95),
		y: randomRange(10, 90),
		depth: randomRange(0.2, 0.9),
		scale: randomRange(0.6, 1.4),
		spinDuration: randomRange(20, 50),
		spinReverse: Math.random() > 0.5,
		driftDuration: randomRange(8, 16),
		driftDelay: randomRange(0, -10),
		floatDuration: randomRange(4, 8),
		floatDelay: randomRange(0, -6),
		blownAway: false,
	}));
});

// ── Click-ripple push for leaves (float away, no spring-back) ─────
let leafPush: Array<{ x: number; y: number }> = [];
let leafVel: Array<{ x: number; y: number }> = [];
let leafPushOutput = $state.raw<Array<{ x: number; y: number }>>([]);

onMount(() => {
	if (!browser) return;

	function handlePageClick(e: MouseEvent) {
		const clickX = (e.clientX / window.innerWidth) * 100;
		const clickY = (e.clientY / window.innerHeight) * 100;

		for (let i = 0; i < leaves.length; i++) {
			const leaf = leaves[i];
			if (!leaf) continue;
			const dx = leaf.x - clickX;
			const dy = leaf.y - clickY;
			const dist = Math.sqrt(dx * dx + dy * dy);
			const maxDist = 30;
			if (dist > maxDist || dist < 0.5) continue;

			const strength = (1 - dist / maxDist) * 3; // gentle push
			const angle = Math.atan2(dy, dx);
			if (leafVel[i]) {
				leafVel[i].x += Math.cos(angle) * strength;
				leafVel[i].y += Math.sin(angle) * strength;
			}
		}
	}

	window.addEventListener('click', handlePageClick);
	return () => window.removeEventListener('click', handlePageClick);
});

// Initialize push arrays when leaves are ready
$effect(() => {
	if (leaves.length && !leafPush.length) {
		leafPush = leaves.map(() => ({ x: 0, y: 0 }));
		leafVel = leaves.map(() => ({ x: 0, y: 0 }));
		leafPushOutput = leaves.map(() => ({ x: 0, y: 0 }));
	}
});

// Animate push — friction slows them down, no spring-back
$effect(() => {
	const _tick = parallax.tick;
	if (!leafVel.length) return;

	const friction = 0.985; // very slow deceleration — they drift
	let anyMoving = false;

	for (let i = 0; i < leafVel.length; i++) {
		if (!leafPush[i]) continue;
		leafPush[i].x += leafVel[i].x;
		leafPush[i].y += leafVel[i].y;
		leafVel[i].x *= friction;
		leafVel[i].y *= friction;

		if (Math.abs(leafVel[i].x) > 0.005 || Math.abs(leafVel[i].y) > 0.005) {
			anyMoving = true;
		}
	}

	if (anyMoving) {
		leafPushOutput = leafPush.map(p => ({ x: p.x, y: p.y }));
	}
});

function handleLeafClick(e: MouseEvent, leafId: number) {
	e.stopPropagation();
	const idx = leaves.findIndex((l) => l.id === leafId);
	if (idx === -1 || leaves[idx].blownAway) return;

	leaves[idx] = { ...leaves[idx], blownAway: true };

	setTimeout(() => {
		const i = leaves.findIndex((l) => l.id === leafId);
		if (i !== -1) {
			leaves[i] = { ...leaves[i], blownAway: false };
		}
	}, 2500);
}

// Compute parallax offsets for each leaf (via CSS custom properties)
function getLeafParallaxX(depth: number): number {
	return parallax.smoothX * depth * 15;
}

function getLeafParallaxY(depth: number): number {
	return parallax.smoothY * depth * 15;
}
</script>

<div class="leaf-layer" class:hidden>
	{#each leaves as leaf, i (leaf.id)}
		{@const zIndex = leaf.depth > 0.5 ? Math.round(8 + leaf.depth * 4) : Math.round(3 + leaf.depth * 4)}
		<!-- svelte-ignore a11y_click_events_have_key_events -->
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div
			class="floating-leaf"
			class:blown-away={leaf.blownAway}
			style:left="{leaf.x}%"
			style:top="{leaf.y}%"
			style:z-index={zIndex}
			style:--parallax-x="{getLeafParallaxX(leaf.depth) + (leafPushOutput[i]?.x ?? 0)}px"
			style:--parallax-y="{getLeafParallaxY(leaf.depth) + (leafPushOutput[i]?.y ?? 0)}px"
			style:--spin-duration="{leaf.spinDuration}s"
			style:--spin-direction={leaf.spinReverse ? 'reverse' : 'normal'}
			style:--drift-duration="{leaf.driftDuration}s"
			style:--drift-delay="{leaf.driftDelay}s"
			style:--float-duration="{leaf.floatDuration}s"
			style:--float-delay="{leaf.floatDelay}s"
			style:--leaf-scale={leaf.scale}
			style:--leaf-opacity={clamp(0.4 + leaf.depth * 0.4, 0.3, 0.8)}
			onclick={(e) => handleLeafClick(e, leaf.id)}
		>
			<img src={leaf.src} alt="" draggable="false" />
		</div>
	{/each}
</div>

<style>
	.leaf-layer {
		position: fixed;
		inset: 0;
		pointer-events: none;
		transition: opacity 500ms ease;
	}

	.leaf-layer.hidden {
		opacity: 0;
	}

	.floating-leaf {
		position: absolute;
		pointer-events: auto;
		cursor: pointer;
		transform: translate(var(--parallax-x, 0px), var(--parallax-y, 0px))
			scale(var(--leaf-scale, 0.5));
		opacity: var(--leaf-opacity, 0.6);
		transition:
			transform 700ms ease-out,
			opacity 700ms ease-out;
	}

	.floating-leaf img {
		width: clamp(50px, 8vw, 100px);
		height: auto;
		pointer-events: none;
		filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.15));
	}

	.floating-leaf.blown-away {
		transform: translate(
				calc(var(--parallax-x, 0px) + 150px),
				calc(var(--parallax-y, 0px) - 80px)
			)
			scale(calc(var(--leaf-scale, 0.5) * 0.4)) rotate(200deg);
		opacity: 0.05;
		transition:
			transform 700ms ease-out,
			opacity 700ms ease-out;
	}

	@keyframes leaf-spin {
		from {
			rotate: 0deg;
		}
		to {
			rotate: 360deg;
		}
	}

	@keyframes leaf-drift {
		0%,
		100% {
			margin-left: 0;
		}
		30% {
			margin-left: 8px;
		}
		70% {
			margin-left: -6px;
		}
	}


	@keyframes leaf-float {
		0%,
		100% {
			margin-top: 0;
		}
		50% {
			margin-top: -6px;
		}
	}

	@media (prefers-reduced-motion: no-preference) {
		.floating-leaf {
			animation:
				leaf-spin var(--spin-duration, 30s) linear infinite var(--spin-direction, normal),
				leaf-drift var(--drift-duration, 10s) ease-in-out infinite var(--drift-delay, 0s),
				leaf-float var(--float-duration, 5s) ease-in-out infinite var(--float-delay, 0s);
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.floating-leaf {
			animation: none;
		}
	}
</style>
