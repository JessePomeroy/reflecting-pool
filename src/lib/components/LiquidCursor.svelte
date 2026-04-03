<script lang="ts">
import { getContext, onMount } from "svelte";
import { browser } from "$app/environment";
import type { ParallaxContext } from "$lib/types/gallery";

// ── Shader sources (inlined to avoid Vite .glsl import headaches) ──────────

const vertexShader = /* glsl */ `
varying vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = vec4(position, 1.0);
}
`;

const fragmentShader = /* glsl */ `
precision highp float;

varying vec2 vUv;

uniform vec2 uResolution;       // canvas logical size in pixels (full screen res)
uniform vec2 uMouse;            // current mouse position (pixels, Y-flipped for GL)
uniform vec2 uVelocity;         // mouse velocity (pixels/frame)
uniform float uTime;            // elapsed time for wobble
uniform float uSpeed;           // |velocity| for stretch calculation

// Trail points – ring buffer of recent positions
#define TRAIL_COUNT 10
uniform vec2  uTrail[TRAIL_COUNT];     // positions (pixels, Y-flipped)
uniform float uTrailAge[TRAIL_COUNT];  // 0.0 = fresh, 1.0 = expired

// Metaball field function
float metaball(vec2 p, vec2 c, float r) {
  float d = length(p - c);
  if (d > r * 4.0) return 0.0; // early-out for distant fragments
  return (r * r) / (d * d + 0.001);
}

void main() {
  // Work in screen-pixel space (same coordinate system as uMouse / uTrail)
  vec2 fragPos = vUv * uResolution;

  // ── Main blob ──────────────────────────────────────────────────────────────
  // Stretch along velocity direction when moving
  vec2 dir = normalize(uVelocity + vec2(0.001, 0.0)); // avoid zero-divide
  float stretch = 1.0 + uSpeed * 0.003;               // max ~2× at ~330 px/frame

  vec2 toMouse  = fragPos - uMouse;
  float alongVel = dot(toMouse, dir);
  float perpVel  = dot(toMouse, vec2(-dir.y, dir.x));
  vec2 stretched = vec2(alongVel / stretch, perpVel);

  // Damped wobble when stationary
  float wobble = 1.0 + sin(uTime * 8.0) * 0.05 * exp(-uSpeed * 0.1);

  float field = metaball(vec2(length(stretched), 0.0), vec2(0.0), 15.0 * wobble);

  // ── Trail blobs ────────────────────────────────────────────────────────────
  for (int i = 0; i < TRAIL_COUNT; i++) {
    float age = uTrailAge[i];
    if (age >= 1.0) continue;

    float radius = mix(10.0, 3.0, age); // shrink as they age
    float alpha  = 1.0 - age;

    field += metaball(fragPos, uTrail[i], radius) * alpha;
  }

  // ── Threshold + smooth edge ────────────────────────────────────────────────
  float threshold = 1.0;
  float edge = smoothstep(threshold - 0.3, threshold + 0.1, field);

  // ── Color ──────────────────────────────────────────────────────────────────
  vec3 color = vec3(0.78, 0.86, 0.94); // soft blue-white
  float glow  = smoothstep(threshold - 0.5, threshold, field) * 0.15;

  // Inner brightness
  float inner = smoothstep(threshold, threshold + 2.0, field);
  color = mix(color, vec3(1.0), inner * 0.3);

  gl_FragColor = vec4(color, edge * 0.4 + glow);
}
`;

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

let lastX = 0;
let lastY = 0;
let enabled = false;

// ── Mount: initialise Three.js ──────────────────────────────────────────────

onMount(() => {
	if (!browser) return;

	// Bail on touch, low-end, or reduced-motion — no cursor to replace
	if (parallax.isTouch) return;
	if (parallax.isLowEnd) return;
	if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

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

	// Frame skip: if barely moving, save GPU time
	if (speed < 0.5 && trail.length === 0) {
		// Still need to age the trail even when idle — only hard-skip if trail is empty
		return;
	}

	// Update mouse uniforms (reusing pre-allocated Vector2)
	mouseVec.set(mx, my);
	velocityVec.set(vx, vy);
	(uniforms.uSpeed as { value: number }).value = speed;
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
