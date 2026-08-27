// Shared device/touch/mobile detection
// Used by ParallaxProvider and any component needing device info

import { browser } from "$app/environment";

export function detectDevice() {
	if (!browser) {
		return { isTouch: false, isMobile: false, isLowEnd: false, hasFinePointer: false };
	}

	const isTouch = "ontouchstart" in window || navigator.maxTouchPoints > 0;
	const hasFinePointer = window.matchMedia("(any-pointer: fine)").matches;

	const isMobile = window.innerWidth < 768;

	const isLowEnd = navigator.hardwareConcurrency != null && navigator.hardwareConcurrency <= 4;

	return { isTouch, isMobile, isLowEnd, hasFinePointer };
}
