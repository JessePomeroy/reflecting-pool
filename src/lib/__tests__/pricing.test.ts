import { getWholesaleCost } from "@jessepomeroy/print-catalog";
import { describe, expect, it } from "vitest";
import { getRetailPrice, getStartingPrice } from "../shop/pricing";
import type { PrintDimensions } from "../shop/types";

const size = (w: number, h: number): PrintDimensions => ({
	width: w,
	height: h,
	label: `${w}×${h}`,
});

describe("getRetailPrice", () => {
	it("returns correct retail for Archival Matte 4x6", () => {
		expect(getRetailPrice("Archival Matte", size(4, 6))).toBe(15);
	});

	it("returns correct retail for Archival Matte 8x10", () => {
		expect(getRetailPrice("Archival Matte", size(8, 10))).toBe(35);
	});

	it("returns correct retail for Archival Matte 11x14", () => {
		expect(getRetailPrice("Archival Matte", size(11, 14))).toBe(55);
	});

	it("returns correct retail for Archival Matte 16x20", () => {
		expect(getRetailPrice("Archival Matte", size(16, 20))).toBe(85);
	});

	it("returns correct retail for Glossy 4x6", () => {
		expect(getRetailPrice("Glossy", size(4, 6))).toBe(18);
	});

	it("returns correct retail for Glossy 8x10", () => {
		expect(getRetailPrice("Glossy", size(8, 10))).toBe(40);
	});

	it("returns correct retail for Glossy 11x14", () => {
		expect(getRetailPrice("Glossy", size(11, 14))).toBe(60);
	});

	it("returns correct retail for Glossy 16x20", () => {
		expect(getRetailPrice("Glossy", size(16, 20))).toBe(95);
	});

	it("returns null for unknown size", () => {
		expect(getRetailPrice("Archival Matte", size(5, 7))).toBeNull();
	});

	it("returns null for unknown paper type", () => {
		expect(getRetailPrice("Velvet Rag", size(8, 10))).toBeNull();
	});
});

describe("pricing profitability", () => {
	it("all margins are positive (healthy pricing)", () => {
		const papers = [
			{ name: "Archival Matte", slug: "archival-matte" },
			{ name: "Glossy", slug: "glossy" },
		] as const;
		const dimensions = [
			[4, 6],
			[8, 10],
			[11, 14],
			[16, 20],
		] as const;
		for (const paper of papers) {
			for (const [width, height] of dimensions) {
				const printSize = size(width, height);
				const retail = getRetailPrice(paper.name, printSize);
				const wholesale = getWholesaleCost(paper.slug, `${width}x${height}`);
				if (retail === null || wholesale === null) {
					throw new Error(`Missing price for ${paper.name} ${printSize.label}`);
				}
				expect(retail - wholesale).toBeGreaterThan(0);
			}
		}
	});
});

describe("getStartingPrice", () => {
	it("returns the lowest price across all paper/size combos", () => {
		const starting = getStartingPrice();
		expect(starting).toBe(15); // Archival Matte 4x6
	});
});
