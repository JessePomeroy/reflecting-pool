import { describe, expect, it } from "vitest";
import { createHeadshotOrbitSlots } from "$lib/components/headshotOrbit";

describe("createHeadshotOrbitSlots", () => {
	it("keeps the active image in one enlarged focal slot", () => {
		const slots = createHeadshotOrbitSlots(6);

		expect(slots).toHaveLength(6);
		expect(slots[0]).toMatchObject({
			name: "hero",
			x: 40,
			width: 23,
			z: 20,
		});
		expect(slots[0]?.y).toBeCloseTo(54);
		expect(slots.slice(1).every((slot) => slot.name === "orbit")).toBe(true);
	});

	it("distributes dense galleries around both sides of one ellipse", () => {
		const slots = createHeadshotOrbitSlots(10);

		expect(slots).toHaveLength(10);
		expect(Math.min(...slots.map((slot) => slot.x))).toBeCloseTo(40);
		expect(Math.max(...slots.map((slot) => slot.x))).toBeCloseTo(96);
		expect(Math.min(...slots.map((slot) => slot.y))).toBeLessThan(26);
		expect(Math.max(...slots.map((slot) => slot.y))).toBeGreaterThan(82);
		expect(slots.slice(1).every((slot) => slot.width < 10)).toBe(true);
	});

	it("clamps invalid counts to the supported zero-to-ten range", () => {
		expect(createHeadshotOrbitSlots(-4)).toEqual([]);
		expect(createHeadshotOrbitSlots(14)).toHaveLength(10);
	});
});
