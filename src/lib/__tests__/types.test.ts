import { describe, expect, it } from "vitest";
import { AVAILABLE_SIZES, PAPER_OPTIONS, PAPER_SUBCATEGORY_IDS } from "../shop/types";

describe("PAPER_SUBCATEGORY_IDS", () => {
	it("Archival Matte has subcategory ID 103001", () => {
		expect(PAPER_SUBCATEGORY_IDS["Archival Matte"]).toBe(103001);
	});

	it("Glossy has subcategory ID 103007", () => {
		expect(PAPER_SUBCATEGORY_IDS["Glossy"]).toBe(103007);
	});

	it("has exactly 2 paper types", () => {
		expect(Object.keys(PAPER_SUBCATEGORY_IDS)).toHaveLength(2);
	});
});

describe("AVAILABLE_SIZES", () => {
	it("has 4 available sizes", () => {
		expect(AVAILABLE_SIZES).toHaveLength(4);
	});

	it("includes 4×6 size", () => {
		expect(AVAILABLE_SIZES).toContainEqual({ width: 4, height: 6, label: "4×6" });
	});

	it("includes 8×10 size", () => {
		expect(AVAILABLE_SIZES).toContainEqual({ width: 8, height: 10, label: "8×10" });
	});

	it("includes 11×14 size", () => {
		expect(AVAILABLE_SIZES).toContainEqual({ width: 11, height: 14, label: "11×14" });
	});

	it("includes 16×20 size", () => {
		expect(AVAILABLE_SIZES).toContainEqual({ width: 16, height: 20, label: "16×20" });
	});

	it("all sizes have width, height, and label", () => {
		for (const s of AVAILABLE_SIZES) {
			expect(typeof s.width).toBe("number");
			expect(typeof s.height).toBe("number");
			expect(typeof s.label).toBe("string");
			expect(s.label.length).toBeGreaterThan(0);
		}
	});
});

describe("PAPER_OPTIONS", () => {
	it("has 2 paper options", () => {
		expect(PAPER_OPTIONS).toHaveLength(2);
	});

	it("Archival Matte option matches subcategory ID", () => {
		const opt = PAPER_OPTIONS.find((p) => p.name === "Archival Matte");
		expect(opt).toBeDefined();
		expect(opt!.subcategoryId).toBe(PAPER_SUBCATEGORY_IDS["Archival Matte"]);
	});

	it("Glossy option matches subcategory ID", () => {
		const opt = PAPER_OPTIONS.find((p) => p.name === "Glossy");
		expect(opt).toBeDefined();
		expect(opt!.subcategoryId).toBe(PAPER_SUBCATEGORY_IDS["Glossy"]);
	});

	it("all options have a non-empty description", () => {
		for (const opt of PAPER_OPTIONS) {
			expect(opt.description.length).toBeGreaterThan(0);
		}
	});
});
