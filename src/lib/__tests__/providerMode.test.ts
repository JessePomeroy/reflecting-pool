import { describe, expect, it } from "vitest";
import { parseContentProviderMode } from "$lib/server/content/providerMode";

describe("Content provider mode", () => {
	it.each(["fallback", "shadow", "convex"] as const)("accepts the exact %s mode", (mode) => {
		expect(parseContentProviderMode(mode)).toEqual({ mode, invalid: false });
	});

	it.each([undefined, "", "   "])("defaults empty input %j to fallback", (value) => {
		expect(parseContentProviderMode(value)).toEqual({ mode: "fallback", invalid: false });
	});

	it.each([
		"unsupported",
		" shadow ",
		"CONVEX",
	])("rejects non-exact input %j without normalizing it", (value) => {
		expect(parseContentProviderMode(value)).toEqual({ mode: "fallback", invalid: true });
	});
});
