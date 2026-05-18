<script lang="ts">
import { onMount, setContext } from "svelte";
import { browser } from "$app/environment";
import {
	applyOrientation,
	applyPointerMove,
	appendRipple,
	createRipple,
	createSurfaceInput,
	createSurfaceOutput,
	createSurfaceRippleState,
	removeRipple,
	shouldTrackPointer,
	stepSurface,
} from "$lib/surface/interactiveSurface";
import type { ParallaxContext, Ripple } from "$lib/types/gallery";
import { detectDevice } from "$lib/utils/device";

interface Props {
	children: import("svelte").Snippet;
}
let { children }: Props = $props();

// Device detection
const device = detectDevice();
let isTouch = $state(device.isTouch);
let isMobile = $state(device.isMobile);
let isLowEnd = $state(device.isLowEnd);
let hasFinePointer = $state(device.hasFinePointer);

const surfaceInput = createSurfaceInput();
const surfaceOutput = createSurfaceOutput();

// Smoothed output (written by rAF)
let smoothX = $state(0);
let smoothY = $state(0);
let smoothPixelX = $state(0);
let smoothPixelY = $state(0);
let tick = $state(0);

// Ripple state
let ripples = $state<Ripple[]>([]);
const rippleState = createSurfaceRippleState();

function addRipple(x: number, y: number) {
	const ripple = createRipple(rippleState, x, y, performance.now());
	ripples = appendRipple(ripples, ripple);
	// Clean up old ripples after animation
	setTimeout(() => {
		ripples = removeRipple(ripples, ripple.id);
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
	get ripples() {
		return ripples;
	},
	addRipple,
};

setContext("parallax", ctx);

onMount(() => {
	if (!browser) return;

	let rafId: number;

	// Mouse tracking
	function handleMouseMove(e: MouseEvent) {
		applyPointerMove(
			surfaceInput,
			e.clientX,
			e.clientY,
			window.innerWidth,
			window.innerHeight,
		);
	}

	// Gyroscope for touch devices
	function handleOrientation(e: DeviceOrientationEvent) {
		applyOrientation(surfaceInput, e.gamma, e.beta);
	}

	// Resize handler
	function handleResize() {
		const d = detectDevice();
		isTouch = d.isTouch;
		isMobile = d.isMobile;
		isLowEnd = d.isLowEnd;
		hasFinePointer = d.hasFinePointer;
	}

	// THE single rAF loop for the entire app
	function animate() {
		stepSurface(surfaceOutput, surfaceInput);
		smoothX = surfaceOutput.smoothX;
		smoothY = surfaceOutput.smoothY;
		smoothPixelX = surfaceOutput.smoothPixelX;
		smoothPixelY = surfaceOutput.smoothPixelY;
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
	if (shouldTrackPointer({ hasFinePointer })) {
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
