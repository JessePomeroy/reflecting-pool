<script lang="ts">
import { getContext, onMount } from "svelte";
import { browser } from "$app/environment";
import type { ParallaxContext } from "$lib/types/gallery";

import { cursorVertexShader as vertexShader, cursorFragmentShader as fragmentShader } from "$lib/shaders/cursor";

// ── Context + canvas ref ────────────────────────────────────────────────────

const parallax = getContext<ParallaxContext>("parallax");

let canvas: HTMLCanvasElement;

// ── Three.js objects (set in onMount, checked in $effect) ──────────────────

// Using a typed ref object so $effect can read them after mount
const refs = {
	renderer: null as import("three").WebGLRenderer | null,
	scene: null as import("three").Scene | null,
	camera: null as import("three").OrthographicCamera | null,
	uniforms: null as Record<string, { value: unknown }> | null,
	// Pre-allocated Three.js objects to avoid per-frame allocation
	trailVecs: null as import("three").Vector2[] | null,
	trailAges: null as number[] | null,
	mouseVec: null as import("three").Vector2 | null,
	velocityVec: null as import("three").Vector2 | null,
	resolutionVec: null as import("three").Vector2 | null,
};

// Trail ring buffer — plain objects, not reactive
interface TrailPoint {
	x: number;
	y: number;
	time: number;
}
const TRAIL_COUNT = 10;
const MIN_TRAIL_DISTANCE = 8; // px between trail points
const TRAIL_LIFETIME = 400; // ms
let trail: TrailPoint[] = [];

let lastX = -1;
let lastY = -1;
let enabled = $state(false);
let initialized = false;
let isHovering = $state(false);

// ── Mount: initialise Three.js ──────────────────────────────────────────────

onMount(() => {
	if (!browser) return;

	// Only skip on actual touch screens and reduced motion
	// Removed isLowEnd check — even 4-core machines handle this fine at half res
	const isTrueTouchScreen = window.matchMedia('(pointer: coarse)').matches;
	if (isTrueTouchScreen) return;
	if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

	// Dynamic import keeps Three.js out of the SSR bundle
	import("three").then((THREE) => {

		const W = window.innerWidth;
		const H = window.innerHeight;

		// Half-resolution renderer (renders at 0.5× pixel density)
		const renderer = new THREE.WebGLRenderer({
			canvas,
			alpha: true,
			antialias: false,
			powerPreference: "low-power",
		});
		renderer.setPixelRatio(0.5); // half resolution
		renderer.setSize(W, H);

		const scene = new THREE.Scene();
		const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

		// Pre-allocate uniform vectors (reused every frame — no GC pressure)
		const trailVecs = Array.from({ length: TRAIL_COUNT }, () => new THREE.Vector2(0, 0));
		const trailAges: number[] = new Array(TRAIL_COUNT).fill(1.0);
		const mouseVec = new THREE.Vector2(W / 2, H / 2);
		const velocityVec = new THREE.Vector2(0, 0);
		const resolutionVec = new THREE.Vector2(W, H);

		const uniforms: Record<string, { value: unknown }> = {
			uResolution: { value: resolutionVec },
			uMouse: { value: mouseVec },
			uVelocity: { value: velocityVec },
			uTime: { value: 0 },
			uSpeed: { value: 0 },
			uHover: { value: 0 },
			uTrail: { value: trailVecs },
			uTrailAge: { value: trailAges },
		};

		const material = new THREE.ShaderMaterial({
			vertexShader,
			fragmentShader,
			uniforms,
			transparent: true,
			depthTest: false,
		});

		const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
		scene.add(quad);

		// Resize handler
		function handleResize() {
			const nW = window.innerWidth;
			const nH = window.innerHeight;
			renderer.setSize(nW, nH);
			resolutionVec.set(nW, nH);
		}
		window.addEventListener("resize", handleResize, { passive: true });

		// Hover detection — change cursor color on interactive elements
		let hoverTimeout: ReturnType<typeof setTimeout> | null = null;
		function onMouseMove(e: MouseEvent) {
			const target = e.target as HTMLElement;
			const clickable = target.closest("a, button, [role=\"button\"]");
			if (clickable && !isHovering) {
				isHovering = true;
				clearTimeout(hoverTimeout!);
			} else if (!clickable && isHovering) {
				isHovering = false;
			}
		}
		window.addEventListener("mouseover", onMouseMove);
		window.addEventListener("mouseout", onMouseMove);

		// Stash refs so $effect can use them
		refs.renderer = renderer;
		refs.scene = scene;
		refs.camera = camera;
		refs.uniforms = uniforms;
		refs.trailVecs = trailVecs;
		refs.trailAges = trailAges;
		refs.mouseVec = mouseVec;
		refs.velocityVec = velocityVec;
		refs.resolutionVec = resolutionVec;
		enabled = true;



		// Cleanup on unmount
		return () => {
			window.removeEventListener("resize", handleResize);
			quad.geometry.dispose();
			material.dispose();
			renderer.dispose();
			refs.renderer = null;
			enabled = false;
		};
	}).catch((err) => {
		if (import.meta.env.DEV) console.error('[LiquidCursor] Failed to load Three.js:', err);
	});
});

// ── Render effect — fires every time ParallaxProvider ticks ────────────────
// This deliberately avoids a separate rAF loop (single rAF in ParallaxProvider)
$effect(() => {
	const _tick = parallax.tick; // reactive dependency — re-runs each frame

	if (!enabled) return;
	const { renderer, scene, camera, uniforms, trailVecs, trailAges, mouseVec, velocityVec } = refs;
	if (
		!renderer ||
		!scene ||
		!camera ||
		!uniforms ||
		!trailVecs ||
		!trailAges ||
		!mouseVec ||
		!velocityVec
	)
		return;

	// Skip when tab is hidden
	if (typeof document !== "undefined" && document.hidden) return;

	// Mouse position in GL pixel space (Y-flipped: WebGL origin is bottom-left)
	const mx = parallax.smoothPixelX;
	const my = window.innerHeight - parallax.smoothPixelY;

	// Velocity
	const vx = mx - lastX;
	const vy = my - lastY;
	const speed = Math.sqrt(vx * vx + vy * vy);

	// Initialize lastX/lastY on first frame (avoid huge speed spike from 0,0)
	if (!initialized) {
		lastX = mx;
		lastY = my;
		initialized = true;
		// Render once so the cursor appears immediately
	}

	// Note: no frame skipping for now — always render so cursor is always visible
	// Can re-add frame skipping later once we confirm the effect works

	// Update mouse uniforms (reusing pre-allocated Vector2)
	mouseVec.set(mx, my);
	velocityVec.set(vx, vy);
	(uniforms.uSpeed as { value: number }).value = speed;
	(uniforms.uHover as { value: number }).value = isHovering ? 1 : 0;
	(uniforms.uTime as { value: number }).value = performance.now() * 0.001;

	// Add trail point if mouse moved enough
	if (speed > MIN_TRAIL_DISTANCE) {
		trail.push({ x: mx, y: my, time: performance.now() });
		if (trail.length > TRAIL_COUNT) trail.shift();
	}

	// Update trail uniforms (reuse pre-allocated Vector2 instances)
	const now = performance.now();
	for (let i = 0; i < TRAIL_COUNT; i++) {
		const point = trail[i];
		if (point) {
			trailVecs[i].set(point.x, point.y); // mutate in place — no allocation
			trailAges[i] = Math.min((now - point.time) / TRAIL_LIFETIME, 1.0);
		} else {
			trailAges[i] = 1.0; // expired / unused
		}
	}
	// Force Three.js to re-upload the trail array this frame
	(uniforms.uTrailAge as { value: number[]; needsUpdate?: boolean }).needsUpdate = true;

	lastX = mx;
	lastY = my;

	renderer.render(scene, camera);
});
</script>

<canvas
	bind:this={canvas}
	class="liquid-cursor"
	aria-hidden="true"
></canvas>

<style>
	.liquid-cursor {
		position: fixed;
		inset: 0;
		width: 100vw;
		height: 100vh;
		z-index: 9999;
		pointer-events: none;
		/* Canvas internal buffer is half resolution; CSS displays at full size */
	}
</style>
