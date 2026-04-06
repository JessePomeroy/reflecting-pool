<script lang="ts">
import { onMount, setContext } from "svelte";
import { browser } from "$app/environment";
import type { ParallaxContext, Ripple } from "$lib/types/gallery";
import { detectDevice } from "$lib/utils/device";
import { clamp, lerp } from "$lib/utils/math";

interface Props {
	children: import("svelte").Snippet;
}
let { children }: Props = $props();

// Device detection
const device = detectDevice();
let isTouch = $state(device.isTouch);
let isMobile = $state(device.isMobile);
let isLowEnd = $state(device.isLowEnd);

// Raw input (written by event handlers)
let rawX = 0;
let rawY = 0;
let rawPixelX = 0;
let rawPixelY = 0;

// Smoothed output (written by rAF)
let smoothX = $state(0);
let smoothY = $state(0);
let smoothPixelX = $state(0);
let smoothPixelY = $state(0);
let tick = $state(0);

// Ripple state
let ripples = $state<Ripple[]>([]);
let rippleId = 0;

// Lerp factor — lower = smoother/slower
const LERP_FACTOR = 0.08;
const MOUSE_THRESHOLD = 2; // minimum delta in px before updating

function addRipple(x: number, y: number) {
	rippleId++;
	ripples = [...ripples, { id: rippleId, x, y, startTime: performance.now() }];
	// Clean up old ripples after animation
	setTimeout(() => {
		ripples = ripples.filter((r) => r.id !== rippleId);
	}, 1200);
}

// The context object — reads from $state vars
const ctx: ParallaxContext = {
	get smoothX() {
		return smoothX;
	},
	get smoothY() {
		return smoothY;
	},
	get smoothPixelX() {
		return smoothPixelX;
	},
	get smoothPixelY() {
		return smoothPixelY;
	},
	get isTouch() {
		return isTouch;
	},
	get isMobile() {
		return isMobile;
	},
	get isLowEnd() {
		return isLowEnd;
	},
	get tick() {
		return tick;
	},
	addRipple,
};

setContext("parallax", ctx);

onMount(() => {
	if (!browser) return;

	let rafId: number;
	let lastRawX = 0;
	let lastRawY = 0;

	// Mouse tracking
	function handleMouseMove(e: MouseEvent) {
		const dx = Math.abs(e.clientX - lastRawX);
		const dy = Math.abs(e.clientY - lastRawY);
		if (dx < MOUSE_THRESHOLD && dy < MOUSE_THRESHOLD) return;

		lastRawX = e.clientX;
		lastRawY = e.clientY;
		rawPixelX = e.clientX;
		rawPixelY = e.clientY;
		rawX = (e.clientX / window.innerWidth - 0.5) * 2;
		rawY = (e.clientY / window.innerHeight - 0.5) * 2;
	}

	// Gyroscope for touch devices
	function handleOrientation(e: DeviceOrientationEvent) {
		rawX = clamp((e.gamma || 0) / 45, -1, 1) * 0.5;
		rawY = clamp((e.beta || 0) / 45, -1, 1) * 0.5;
	}

	// Resize handler
	function handleResize() {
		const d = detectDevice();
		isTouch = d.isTouch;
		isMobile = d.isMobile;
		isLowEnd = d.isLowEnd;
	}

	// THE single rAF loop for the entire app
	function animate() {
		smoothX = lerp(smoothX, rawX, LERP_FACTOR);
		smoothY = lerp(smoothY, rawY, LERP_FACTOR);
		smoothPixelX = lerp(smoothPixelX, rawPixelX, LERP_FACTOR);
		smoothPixelY = lerp(smoothPixelY, rawPixelY, LERP_FACTOR);
		tick++;

		rafId = requestAnimationFrame(animate);
	}

	// Pause rAF when tab is hidden, resume when visible
	function handleVisibilityChange() {
		if (document.hidden) {
			cancelAnimationFrame(rafId);
		} else {
			rafId = requestAnimationFrame(animate);
		}
	}

	// Attach listeners
	if (!isTouch) {
		window.addEventListener("mousemove", handleMouseMove, { passive: true });
	}

	if (isTouch && window.DeviceOrientationEvent) {
		// iOS 13+ requires permission for gyroscope access
		interface DeviceOrientationEventWithPermission {
			requestPermission?: () => Promise<"granted" | "denied">;
		}
		const DOE = DeviceOrientationEvent as unknown as DeviceOrientationEventWithPermission;
		if (typeof DOE.requestPermission === "function") {
			// iOS: request on first user interaction (must be click/touch gesture)
			const requestGyro = () => {
				DOE.requestPermission?.()
					.then((state) => {
						if (state === "granted") {
							window.addEventListener("deviceorientation", handleOrientation, { passive: true });
						}
					})
					.catch(() => {});
			};
			// Use both click and touchend for maximum compatibility
			window.addEventListener("click", requestGyro, { once: true });
			window.addEventListener("touchend", requestGyro, { once: true });
		} else {
			// Android / non-iOS — no permission needed
			window.addEventListener("deviceorientation", handleOrientation, { passive: true });
		}
	}

	window.addEventListener("resize", handleResize, { passive: true });
	document.addEventListener("visibilitychange", handleVisibilityChange);

	rafId = requestAnimationFrame(animate);

	return () => {
		cancelAnimationFrame(rafId);
		window.removeEventListener("mousemove", handleMouseMove);
		window.removeEventListener("deviceorientation", handleOrientation);
		window.removeEventListener("resize", handleResize);
		document.removeEventListener("visibilitychange", handleVisibilityChange);
	};
});
</script>

{@render children()}
