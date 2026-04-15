import { describe, expect, it } from "vitest";
import { getPaper, getSize, V2_PAPERS, V2_SIZES } from "../shop/v2Catalog";

describe("V2_PAPERS", () => {
	it("has at least one paper entry", () => {
		expect(V2_PAPERS.length).toBeGreaterThan(0);
	});

	it("includes Archival Matte with subcategory ID 103001", () => {
		const paper = V2_PAPERS.find((p) => p.name === "Archival Matte");
		expect(paper).toBeDefined();
		expect(paper!.subcategoryId).toBe(103001);
	});

	it("includes Glossy with subcategory ID 103007", () => {
		const paper = V2_PAPERS.find((p) => p.name === "Glossy");
		expect(paper).toBeDefined();
		expect(paper!.subcategoryId).toBe(103007);
	});

	it("all papers have slug, name, subcategoryId, and description", () => {
		for (const p of V2_PAPERS) {
			expect(typeof p.slug).toBe("string");
			expect(p.slug.length).toBeGreaterThan(0);
			expect(typeof p.name).toBe("string");
			expect(p.name.length).toBeGreaterThan(0);
			expect(typeof p.subcategoryId).toBe("number");
			expect(typeof p.description).toBe("string");
		}
	});
});

describe("V2_SIZES", () => {
	it("has at least one size entry", () => {
		expect(V2_SIZES.length).toBeGreaterThan(0);
	});

	it("includes 8x10 size", () => {
		const size = V2_SIZES.find((s) => s.slug === "8x10");
		expect(size).toBeDefined();
		expect(size!.width).toBe(8);
		expect(size!.height).toBe(10);
	});

	it("all sizes have slug, label, width, and height", () => {
		for (const s of V2_SIZES) {
			expect(typeof s.slug).toBe("string");
			expect(s.slug.length).toBeGreaterThan(0);
			expect(typeof s.label).toBe("string");
			expect(typeof s.width).toBe("number");
			expect(typeof s.height).toBe("number");
		}
	});
});

describe("getPaper", () => {
	it("returns paper by slug", () => {
		const paper = getPaper("archival-matte");
		expect(paper).toBeDefined();
		expect(paper!.name).toBe("Archival Matte");
	});

	it("returns undefined for unknown slug", () => {
		expect(getPaper("nonexistent")).toBeUndefined();
	});

	it("returns synthetic entry for canvas slugs", () => {
		const paper = getPaper("canvas-black-0.75");
		expect(paper).toBeDefined();
		expect(paper!.subcategoryId).toBe(0);
	});
});

describe("getSize", () => {
	it("returns size by slug", () => {
		const size = getSize("8x10");
		expect(size).toBeDefined();
		expect(size!.width).toBe(8);
		expect(size!.height).toBe(10);
	});

	it("returns undefined for unknown slug", () => {
		expect(getSize("99x99")).toBeUndefined();
	});
});
