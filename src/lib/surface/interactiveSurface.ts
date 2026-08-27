import type { Ripple } from "$lib/types/gallery";
import { clamp, lerp } from "$lib/utils/math";

export const SURFACE_LERP_FACTOR = 0.08;
export const POINTER_MOVE_THRESHOLD = 2;
export const RIPPLE_LIFETIME_MS = 1200;

export interface SurfaceDeviceProfile {
	hasFinePointer: boolean;
}

export interface SurfaceInput {
	rawX: number;
	rawY: number;
	rawPixelX: number;
	rawPixelY: number;
	lastPointerX: number;
	lastPointerY: number;
}

export interface SurfaceOutput {
	smoothX: number;
	smoothY: number;
	smoothPixelX: number;
	smoothPixelY: number;
}

export interface SurfaceRippleState {
	nextId: number;
}

export function createSurfaceInput(): SurfaceInput {
	return {
		rawX: 0,
		rawY: 0,
		rawPixelX: 0,
		rawPixelY: 0,
		lastPointerX: 0,
		lastPointerY: 0,
	};
}

export function createSurfaceOutput(): SurfaceOutput {
	return {
		smoothX: 0,
		smoothY: 0,
		smoothPixelX: 0,
		smoothPixelY: 0,
	};
}

export function createSurfaceRippleState(): SurfaceRippleState {
	return { nextId: 0 };
}

export function shouldTrackPointer(device: SurfaceDeviceProfile): boolean {
	return device.hasFinePointer;
}

export function shouldEnableLiquidCursor(options: {
	hasFinePointer: boolean;
	prefersReducedMotion: boolean;
}): boolean {
	return options.hasFinePointer && !options.prefersReducedMotion;
}

export function applyPointerMove(
	input: SurfaceInput,
	x: number,
	y: number,
	viewportWidth: number,
	viewportHeight: number,
	threshold = POINTER_MOVE_THRESHOLD,
): boolean {
	const dx = Math.abs(x - input.lastPointerX);
	const dy = Math.abs(y - input.lastPointerY);
	if (dx < threshold && dy < threshold) return false;

	input.lastPointerX = x;
	input.lastPointerY = y;
	input.rawPixelX = x;
	input.rawPixelY = y;
	input.rawX = normalizePointerAxis(x, viewportWidth);
	input.rawY = normalizePointerAxis(y, viewportHeight);
	return true;
}

export function applyOrientation(input: SurfaceInput, gamma: number | null, beta: number | null) {
	input.rawX = clamp((gamma || 0) / 45, -1, 1) * 0.5;
	input.rawY = clamp((beta || 0) / 45, -1, 1) * 0.5;
}

export function stepSurface(
	output: SurfaceOutput,
	input: SurfaceInput,
	lerpFactor = SURFACE_LERP_FACTOR,
) {
	output.smoothX = lerp(output.smoothX, input.rawX, lerpFactor);
	output.smoothY = lerp(output.smoothY, input.rawY, lerpFactor);
	output.smoothPixelX = lerp(output.smoothPixelX, input.rawPixelX, lerpFactor);
	output.smoothPixelY = lerp(output.smoothPixelY, input.rawPixelY, lerpFactor);
}

export function createRipple(state: SurfaceRippleState, x: number, y: number, now: number): Ripple {
	state.nextId++;
	return {
		id: state.nextId,
		x,
		y,
		startTime: now,
	};
}

export function appendRipple(ripples: Ripple[], ripple: Ripple): Ripple[] {
	return [...ripples, ripple];
}

export function removeRipple(ripples: Ripple[], id: number): Ripple[] {
	return ripples.filter((ripple) => ripple.id !== id);
}

function normalizePointerAxis(value: number, size: number) {
	if (size <= 0) return 0;
	return (value / size - 0.5) * 2;
}
