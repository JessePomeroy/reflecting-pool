import { describe, expect, it } from "vitest";
import { safeSanityFetchFailure } from "./sanityClient";

describe("safeSanityFetchFailure", () => {
	it("keeps useful error identity without retaining request headers", () => {
		const error = Object.assign(new Error("Bearer must-not-appear"), {
			code: "ENOTFOUND",
			request: {
				headers: {
					authorization: "Bearer must-not-appear",
				},
			},
		});

		const failure = safeSanityFetchFailure(error);

		expect(failure).toEqual({
			name: "Error",
			code: "ENOTFOUND",
		});
		expect(JSON.stringify(failure)).not.toContain("must-not-appear");
		expect(failure).not.toHaveProperty("request");
	});

	it("does not serialize arbitrary thrown values", () => {
		const failure = safeSanityFetchFailure({
			token: "must-not-appear",
		});

		expect(failure).toEqual({
			name: "UnknownError",
		});
		expect(JSON.stringify(failure)).not.toContain("must-not-appear");
	});

	it("does not coerce arbitrary error codes", () => {
		const failure = safeSanityFetchFailure({
			code: {
				toString: () => "must-not-appear",
			},
		});

		expect(failure).toEqual({ name: "UnknownError" });
		expect(JSON.stringify(failure)).not.toContain("must-not-appear");
	});
});
