import { describe, expect, it } from "vitest";
import {
	getAllPrices,
	getCost,
	getMargin,
	getRetailPrice,
	getStartingPrice,
	getStartingPriceForPaper,
} from "../shop/pricing";
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
		// @ts-expect-error — intentionally wrong type for test
		expect(getRetailPrice("Velvet Rag", size(8, 10))).toBeNull();
	});
});

describe("getCost", () => {
	it("returns LumaPrints cost for Archival Matte 8x10", () => {
		expect(getCost("Archival Matte", size(8, 10))).toBe(3.19);
	});

	it("returns LumaPrints cost for Glossy 16x20", () => {
		expect(getCost("Glossy", size(16, 20))).toBe(10.2);
	});

	it("returns null for unknown combination", () => {
		expect(getCost("Archival Matte", size(5, 7))).toBeNull();
	});
});

describe("getMargin", () => {
	it("returns correct margin for Archival Matte 4x6", () => {
		const margin = getMargin("Archival Matte", size(4, 6));
		expect(margin).toBeCloseTo(15 - 1.71, 5);
	});

	it("returns correct margin for Glossy 16x20", () => {
		const margin = getMargin("Glossy", size(16, 20));
		expect(margin).toBeCloseTo(95 - 10.2, 5);
	});

	it("all margins are positive (healthy pricing)", () => {
		const papers = ["Archival Matte", "Glossy"] as const;
		const sizes = [size(4, 6), size(8, 10), size(11, 14), size(16, 20)];
		for (const paper of papers) {
			for (const s of sizes) {
				const margin = getMargin(paper, s);
				expect(margin).not.toBeNull();
				expect(margin!).toBeGreaterThan(0);
			}
		}
	});

	it("returns null for unknown combination", () => {
		expect(getMargin("Archival Matte", size(5, 7))).toBeNull();
	});
});

describe("getStartingPrice", () => {
	it("returns the lowest price across all paper/size combos", () => {
		const starting = getStartingPrice();
		expect(starting).toBe(15); // Archival Matte 4x6
	});
});

describe("getStartingPriceForPaper", () => {
	it("returns the lowest Archival Matte price", () => {
		expect(getStartingPriceForPaper("Archival Matte")).toBe(15);
	});

	it("returns the lowest Glossy price", () => {
		expect(getStartingPriceForPaper("Glossy")).toBe(18);
	});
});

describe("getAllPrices", () => {
	it("returns correct number of entries (2 papers × 4 sizes)", () => {
		expect(getAllPrices()).toHaveLength(8);
	});

	it("each entry has required fields", () => {
		for (const entry of getAllPrices()) {
			expect(entry).toHaveProperty("paper");
			expect(entry).toHaveProperty("width");
			expect(entry).toHaveProperty("height");
			expect(entry).toHaveProperty("sizeLabel");
			expect(entry).toHaveProperty("retail");
			expect(entry).toHaveProperty("cost");
		}
	});
});
