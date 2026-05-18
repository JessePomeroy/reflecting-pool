import { describe, expect, it } from "vitest";
import {
	appendRipple,
	applyOrientation,
	applyPointerMove,
	createRipple,
	createSurfaceInput,
	createSurfaceOutput,
	createSurfaceRippleState,
	pruneExpiredRipples,
	removeRipple,
	shouldEnableLiquidCursor,
	shouldTrackPointer,
	stepSurface,
} from "$lib/surface/interactiveSurface";

describe("interactive surface", () => {
	it("tracks pointer input only for fine pointer devices", () => {
		expect(shouldTrackPointer({ hasFinePointer: true })).toBe(true);
		expect(shouldTrackPointer({ hasFinePointer: false })).toBe(false);
	});

	it("enables the liquid cursor only for fine pointer devices without reduced motion", () => {
		expect(shouldEnableLiquidCursor({ hasFinePointer: true, prefersReducedMotion: false })).toBe(
			true,
		);
		expect(shouldEnableLiquidCursor({ hasFinePointer: false, prefersReducedMotion: false })).toBe(
			false,
		);
		expect(shouldEnableLiquidCursor({ hasFinePointer: true, prefersReducedMotion: true })).toBe(
			false,
		);
	});

	it("normalizes accepted pointer moves into -1 to 1 viewport coordinates", () => {
		const input = createSurfaceInput();

		expect(applyPointerMove(input, 100, 50, 200, 100)).toBe(true);
		expect(input.rawX).toBe(0);
		expect(input.rawY).toBe(0);
		expect(input.rawPixelX).toBe(100);
		expect(input.rawPixelY).toBe(50);

		expect(applyPointerMove(input, 0, 100, 200, 100)).toBe(true);
		expect(input.rawX).toBe(-1);
		expect(input.rawY).toBe(1);
	});

	it("ignores pointer moves below the movement threshold", () => {
		const input = createSurfaceInput();

		expect(applyPointerMove(input, 100, 50, 200, 100)).toBe(true);
		expect(applyPointerMove(input, 101, 51, 200, 100)).toBe(false);
		expect(input.rawPixelX).toBe(100);
		expect(input.rawPixelY).toBe(50);
	});

	it("normalizes orientation input with clamped gyro values", () => {
		const input = createSurfaceInput();

		applyOrientation(input, 90, -90);

		expect(input.rawX).toBe(0.5);
		expect(input.rawY).toBe(-0.5);
	});

	it("smooths surface output toward the latest input", () => {
		const input = createSurfaceInput();
		const output = createSurfaceOutput();
		applyPointerMove(input, 200, 100, 200, 100);

		stepSurface(output, input, 0.25);

		expect(output.smoothX).toBe(0.25);
		expect(output.smoothY).toBe(0.25);
		expect(output.smoothPixelX).toBe(50);
		expect(output.smoothPixelY).toBe(25);
	});

	it("creates stable ripple ids without closing over mutable counters", () => {
		const state = createSurfaceRippleState();

		const first = createRipple(state, 10, 20, 100);
		const second = createRipple(state, 30, 40, 120);

		expect(first).toEqual({ id: 1, x: 10, y: 20, startTime: 100 });
		expect(second).toEqual({ id: 2, x: 30, y: 40, startTime: 120 });
	});

	it("appends and removes ripples by id", () => {
		const state = createSurfaceRippleState();
		const first = createRipple(state, 10, 20, 100);
		const second = createRipple(state, 30, 40, 120);
		const ripples = appendRipple(appendRipple([], first), second);

		expect(ripples).toEqual([first, second]);
		expect(removeRipple(ripples, first.id)).toEqual([second]);
	});

	it("prunes expired ripples by timestamp", () => {
		const state = createSurfaceRippleState();
		const oldRipple = createRipple(state, 10, 20, 100);
		const activeRipple = createRipple(state, 30, 40, 1000);

		expect(pruneExpiredRipples([oldRipple, activeRipple], 1400, 1200)).toEqual([activeRipple]);
	});
});
