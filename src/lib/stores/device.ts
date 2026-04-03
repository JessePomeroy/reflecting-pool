// Shared device/touch/mobile detection
// Used by ParallaxProvider and any component needing device info

import { browser } from '$app/environment';

export function detectDevice() {
	if (!browser) {
		return { isTouch: false, isMobile: false, isLowEnd: false };
	}

	const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

	const isMobile = window.innerWidth < 768;

	const isLowEnd = navigator.hardwareConcurrency != null && navigator.hardwareConcurrency <= 4;

	return { isTouch, isMobile, isLowEnd };
}

export function getBreakpoint(): 'mobile' | 'tablet' | 'desktop' {
	if (!browser) return 'desktop';
	const w = window.innerWidth;
	if (w < 768) return 'mobile';
	if (w < 1024) return 'tablet';
	return 'desktop';
}
