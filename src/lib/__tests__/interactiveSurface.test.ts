import { describe, expect, it } from "vitest";
import {
	applyOrientation,
	applyPointerMove,
	createSurfaceInput,
	createSurfaceOutput,
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
});
