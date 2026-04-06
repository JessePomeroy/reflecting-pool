<script lang="ts">
import { getContext, onMount } from "svelte";
import { browser } from "$app/environment";
import type { GalleryCluster, ParallaxContext } from "$lib/types/gallery";
import {
	clamp,
	distance,
	generateClusterPositions,
	generateNonOverlappingClusterPositions,
	randomRange,
} from "$lib/utils/math";
import {
	applyClickImpulse,
	CLUSTER_RIPPLE,
	createRippleSystem,
	snapshotPush,
	stepRipple,
} from "$lib/utils/ripple";
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

// Cluster footprint (px) — captured at mount, used by the runtime
// collision solver to push overlapping clusters apart.
let footprintW = $state(220);
let footprintH = $state(199);

// Compute cluster footprint in px matching the CSS clamps in .cluster-images
// + .cluster-title. Keep in sync with the style block below.
function measureClusterFootprint(vw: number) {
	// .cluster-images: width clamp(140px, 20vw, 220px); height clamp(110px, 15vw, 170px)
	const imgW = clamp(0.2 * vw, 140, 220);
	const imgH = clamp(0.15 * vw, 110, 170);
	// .cluster-title: ~1.2rem font + 0.6rem bottom margin ≈ 29px
	const titleH = 29;
	return { w: imgW, h: imgH + titleH };
}

onMount(() => {
	if (!browser) return;

	if (parallax.isMobile) {
		// Mobile uses a flex column — positions are unused for layout but
		// still drive depth/wander calculations.
		positions = generateClusterPositions(clusters.length, 15, true);
	} else {
		const vw = window.innerWidth;
		const vh = window.innerHeight;
		const { w: clusterW, h: clusterH } = measureClusterFootprint(vw);
		footprintW = clusterW;
		footprintH = clusterH;
		// Smaller motion budget here — runtime collision solver handles
		// active drift, this just spaces the static positions.
		positions = generateNonOverlappingClusterPositions({
			count: clusters.length,
			viewportW: vw,
			viewportH: vh,
			clusterW,
			clusterH,
			motionBudget: 12,
			gap: 18,
			bounds: { minX: 10, maxX: 90, minY: 34, maxY: 94 },
		});
	}

	// Assign depths — further from center = deeper
	clusterDepths = positions.map((pos) => {
		const distFromCenter = distance(pos.x, pos.y, 50, 55);
		return clamp(0.3 + distFromCenter * 0.012, 0.3, 0.8);
	});

	// Initialize wander
	wanderOffsets = clusters.map(() => ({ x: 0, y: 0 }));
	wanderFreqs = clusters.map(() => ({
		fx: randomRange(0.00008, 0.00022),
		fy: randomRange(0.00008, 0.00022),
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

	// Mobile uses a flex column layout — positions are static, wander unused
	if (parallax.isMobile) {
		return clusters.map(() => ({ x: 0, y: 0 }));
	}

	// Skip sine-wave wander when reduced motion is preferred
	if (prefersReducedMotion) {
		return clusters.map(() => ({ x: 0, y: 0 }));
	}

	const now = performance.now();
	const amplitude = 38;

	const newOffsets = new Array(clusters.length);
	for (let i = 0; i < clusters.length; i++) {
		const f = wanderFreqs[i];
		// Two summed sines per axis → more organic drift than a single wave
		newOffsets[i] = {
			x:
				Math.sin(now * f.fx + f.px) * amplitude * 0.7 +
				Math.sin(now * f.fx * 2.3 + f.py) * amplitude * 0.3,
			y:
				Math.sin(now * f.fy + f.py) * amplitude * 0.7 +
				Math.sin(now * f.fy * 1.9 + f.px) * amplitude * 0.3,
		};
	}

	return newOffsets;
});

// ── Runtime collision resolution ──────────────────────────────────
// Combines base + wander + parallax + ripple into absolute positions,
// then runs a short anisotropic relaxation pass so overlapping clusters
// push each other apart. Returns per-cluster pixel offsets to apply.
let finalOffsets = $derived.by(() => {
	const _tick = parallax.tick; // dependency
	const n = clusters.length;
	if (!positions.length || parallax.isMobile) {
		return new Array(n).fill(null).map(() => ({ x: 0, y: 0 }));
	}

	const vw = window.innerWidth;
	const vh = window.innerHeight;

	// Desired absolute px positions
	const ax = new Array<number>(n);
	const ay = new Array<number>(n);
	const bx = new Array<number>(n);
	const by = new Array<number>(n);

	for (let i = 0; i < n; i++) {
		bx[i] = (positions[i].x / 100) * vw;
		by[i] = (positions[i].y / 100) * vh;
		const depth = clusterDepths[i] ?? 0.5;
		const w = wanderComputed[i] ?? { x: 0, y: 0 };
		const r = rippleOutput[i] ?? { x: 0, y: 0 };
		const pxO = parallax.smoothX * depth * 20;
		const pyO = parallax.smoothY * depth * 20;
		ax[i] = bx[i] + w.x + pxO + r.x;
		ay[i] = by[i] + w.y + pyO + r.y;
	}

	// Anisotropic elliptical relaxation — cluster size + small gap
	const sepX = footprintW + 14;
	const sepY = footprintH + 14;
	const ITERATIONS = 6;
	for (let iter = 0; iter < ITERATIONS; iter++) {
		let moved = false;
		for (let i = 0; i < n; i++) {
			for (let j = i + 1; j < n; j++) {
				const dx = ax[j] - ax[i];
				const dy = ay[j] - ay[i];
				const nx = dx / sepX;
				const ny = dy / sepY;
				const d2 = nx * nx + ny * ny;
				if (d2 >= 1) continue;
				moved = true;
				let ex: number, ey: number;
				if (d2 < 1e-6) {
					ex = sepX * 0.5;
					ey = 0;
				} else {
					const d = Math.sqrt(d2);
					// Push to the unit-ellipse boundary with slight overshoot
					// for a soft-bounce feel
					const push = (1 - d) * 0.55;
					ex = (nx / d) * sepX * push;
					ey = (ny / d) * sepY * push;
				}
				ax[i] -= ex * 0.5;
				ay[i] -= ey * 0.5;
				ax[j] += ex * 0.5;
				ay[j] += ey * 0.5;
			}
		}
		if (!moved) break;
	}

	// Return offsets from each cluster's base position
	const offsets = new Array(n);
	for (let i = 0; i < n; i++) {
		offsets[i] = { x: ax[i] - bx[i], y: ay[i] - by[i] };
	}
	return offsets;
});

// ── Ripple push (shared physics) ──────────────────────────────────
const ripple = createRippleSystem(clusters.length);
let rippleOutput = $state.raw<Array<{ x: number; y: number }>>(
	clusters.map(() => ({ x: 0, y: 0 })),
);

onMount(() => {
	if (!browser) return;

	function handlePageClick(e: MouseEvent) {
		const clickX = (e.clientX / window.innerWidth) * 100;
		const clickY = (e.clientY / window.innerHeight) * 100;
		applyClickImpulse(clickX, clickY, positions, ripple.vel, CLUSTER_RIPPLE);
	}

	window.addEventListener("click", handlePageClick);
	return () => window.removeEventListener("click", handlePageClick);
});

$effect(() => {
	const _tick = parallax.tick;
	if (!ripple.vel.length) return;
	if (stepRipple(ripple.push, ripple.vel, CLUSTER_RIPPLE)) {
		rippleOutput = snapshotPush(ripple.push);
	}
});

function handleClusterClick(cluster: GalleryCluster) {
	onclusterclick(cluster);
}
</script>

<div class="cluster-field" class:dismissing>
    {#each clusters as cluster, i}
        {@const pos = positions[i]}
        {@const depth = clusterDepths[i] ?? 0.5}
        {@const offset = finalOffsets[i] ?? { x: 0, y: 0 }}
        {#if pos}
            <!-- svelte-ignore a11y_click_events_have_key_events -->
            <!-- svelte-ignore a11y_no_static_element_interactions -->
            <div
                class="cluster"
                class:dismiss={dismissing}
                style:left="{pos.x}%"
                style:top="{pos.y}%"
                style:--cx="{offset.x}px"
                style:--cy="{offset.y}px"
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
                            <img
                                src={img.src}
                                alt={img.alt}
                                loading="lazy"
                                draggable="false"
                            />
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
        transform: translate(
            calc(-50% + var(--cx, 0px)),
            calc(-50% + var(--cy, 0px))
        );
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
        font-family: var(--font-serif);
        font-weight: 300;
        font-size: clamp(0.8rem, 1.2vw, 1rem);
        color: rgba(var(--paper-rgb), 0.4);
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
        transform: translate(
                calc(-50% + var(--ox, 0px)),
                calc(-50% + var(--oy, 0px))
            )
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
        color: rgba(var(--paper-rgb), 0.7);
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
            overflow-y: auto;
            overflow-x: hidden;
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 1rem;
            padding: 18vh 1rem 4rem;
        }

        .cluster {
            position: relative;
            left: auto !important;
            top: auto !important;
            transform: translate(var(--cx, 0px), var(--cy, 0px));
            flex-shrink: 0;
        }

        .cluster.dismiss {
            transform: translateY(30px);
        }

        .cluster-images {
            width: clamp(200px, 65vw, 300px);
            height: clamp(160px, 48vw, 230px);
        }

        .cluster-thumb {
            width: clamp(120px, 38vw, 180px);
        }
    }

    /* Landscape phones — short viewport, push clusters below title */
    @media (max-width: 767px) and (orientation: landscape) {
        .cluster-field {
            padding-top: 55vh;
        }
    }
</style>
