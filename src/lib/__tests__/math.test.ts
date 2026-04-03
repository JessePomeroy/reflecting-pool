import { describe, expect, it } from "vitest";
import {
	clamp,
	distance,
	easeInCubic,
	easeInOutCubic,
	easeOutCubic,
	lerp,
	normalize,
	randomRange,
} from "../utils/math";

describe("lerp", () => {
	it("returns a at t=0", () => {
		expect(lerp(0, 10, 0)).toBe(0);
	});

	it("returns b at t=1", () => {
		expect(lerp(0, 10, 1)).toBe(10);
	});

	it("returns midpoint at t=0.5", () => {
		expect(lerp(0, 10, 0.5)).toBe(5);
	});

	it("interpolates between negative values", () => {
		expect(lerp(-10, 10, 0.5)).toBe(0);
	});

	it("handles same a and b", () => {
		expect(lerp(5, 5, 0.5)).toBe(5);
	});

	it("handles t > 1 (extrapolation)", () => {
		expect(lerp(0, 10, 2)).toBe(20);
	});
});

describe("clamp", () => {
	it("returns value when within range", () => {
		expect(clamp(5, 0, 10)).toBe(5);
	});

	it("clamps to min when below", () => {
		expect(clamp(-5, 0, 10)).toBe(0);
	});

	it("clamps to max when above", () => {
		expect(clamp(15, 0, 10)).toBe(10);
	});

	it("returns min when value equals min", () => {
		expect(clamp(0, 0, 10)).toBe(0);
	});

	it("returns max when value equals max", () => {
		expect(clamp(10, 0, 10)).toBe(10);
	});

	it("handles negative ranges", () => {
		expect(clamp(-15, -10, -5)).toBe(-10);
		expect(clamp(-7, -10, -5)).toBe(-7);
		expect(clamp(-3, -10, -5)).toBe(-5);
	});

	it("handles zero range (min === max)", () => {
		expect(clamp(5, 3, 3)).toBe(3);
	});
});

describe("normalize", () => {
	it("maps inMin to outMin (0 default)", () => {
		expect(normalize(0, 0, 100)).toBe(0);
	});

	it("maps inMax to outMax (1 default)", () => {
		expect(normalize(100, 0, 100)).toBe(1);
	});

	it("maps midpoint correctly", () => {
		expect(normalize(50, 0, 100)).toBe(0.5);
	});

	it("maps to custom output range", () => {
		expect(normalize(5, 0, 10, 0, 100)).toBe(50);
	});

	it("clamps values below inMin to outMin", () => {
		expect(normalize(-10, 0, 100)).toBe(0);
	});

	it("clamps values above inMax to outMax", () => {
		expect(normalize(200, 0, 100)).toBe(1);
	});

	it("handles negative input ranges", () => {
		expect(normalize(0, -10, 10)).toBe(0.5);
	});

	it("maps correctly with non-zero outMin", () => {
		expect(normalize(5, 0, 10, 10, 20)).toBe(15);
	});
});

describe("easeOutCubic", () => {
	it("returns 0 at t=0", () => {
		expect(easeOutCubic(0)).toBe(0);
	});

	it("returns 1 at t=1", () => {
		expect(easeOutCubic(1)).toBe(1);
	});

	it("returns > 0.5 at t=0.5 (decelerating)", () => {
		expect(easeOutCubic(0.5)).toBeGreaterThan(0.5);
	});
});

describe("easeInCubic", () => {
	it("returns 0 at t=0", () => {
		expect(easeInCubic(0)).toBe(0);
	});

	it("returns 1 at t=1", () => {
		expect(easeInCubic(1)).toBe(1);
	});

	it("returns < 0.5 at t=0.5 (accelerating)", () => {
		expect(easeInCubic(0.5)).toBeLessThan(0.5);
	});
});

describe("easeInOutCubic", () => {
	it("returns 0 at t=0", () => {
		expect(easeInOutCubic(0)).toBe(0);
	});

	it("returns 1 at t=1", () => {
		expect(easeInOutCubic(1)).toBe(1);
	});

	it("returns 0.5 at t=0.5 (symmetric)", () => {
		expect(easeInOutCubic(0.5)).toBeCloseTo(0.5);
	});
});

describe("distance", () => {
	it("returns 0 for same point", () => {
		expect(distance(0, 0, 0, 0)).toBe(0);
	});

	it("returns correct distance for horizontal line", () => {
		expect(distance(0, 0, 3, 0)).toBe(3);
	});

	it("returns correct distance for vertical line", () => {
		expect(distance(0, 0, 0, 4)).toBe(4);
	});

	it("returns correct 3-4-5 triangle distance", () => {
		expect(distance(0, 0, 3, 4)).toBe(5);
	});

	it("handles negative coordinates", () => {
		expect(distance(-1, -1, 2, 3)).toBeCloseTo(5);
	});
});

describe("randomRange", () => {
	it("returns value within [min, max]", () => {
		for (let i = 0; i < 100; i++) {
			const val = randomRange(5, 10);
			expect(val).toBeGreaterThanOrEqual(5);
			expect(val).toBeLessThanOrEqual(10);
		}
	});

	it("returns min when min === max", () => {
		expect(randomRange(7, 7)).toBe(7);
	});
});
