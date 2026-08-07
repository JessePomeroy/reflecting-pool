import { readFileSync } from "node:fs";
import { getPaper, getSize } from "@jessepomeroy/print-catalog";
import { describe, expect, it } from "vitest";
import { api } from "$convex/api";

function version(packageName: string) {
	return JSON.parse(readFileSync(`node_modules/${packageName}/package.json`, "utf8")).version;
}

describe("package compatibility", () => {
	it("uses the published CRM 3.0 and print-catalog 0.3 contracts", () => {
		expect(version("@jessepomeroy/crm-api")).toBe("3.0.0");
		expect(version("@jessepomeroy/print-catalog")).toMatch(/^0\.3\./);
		expect(api.catalogProductGraphs.getPublishedBySlug).toBeTruthy();
		expect(getPaper("archival-matte")?.subcategoryId).toBe(103001);
		expect(getSize("8x10")).toMatchObject({ width: 8, height: 10 });
	});
});
