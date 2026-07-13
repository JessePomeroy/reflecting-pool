/* @vitest-environment jsdom */

import { beforeEach, describe, expect, it } from "vitest";
import {
	CAL_EMBED_ORIGIN,
	CAL_EMBED_SCRIPT_SRC,
	type CalEmbedApi,
	type CalEmbedWindow,
	initializeCalEmbed,
} from "$lib/client/calEmbed";

const calWindow = window as CalEmbedWindow;

function queuedCalls(api: CalEmbedApi) {
	return api.q.map((entry) => Array.from(entry));
}

function loaderScripts() {
	return document.head.querySelectorAll(`script[src="${CAL_EMBED_SCRIPT_SRC}"]`);
}

describe("Cal.com embed loader", () => {
	beforeEach(() => {
		delete calWindow.Cal;
		for (const script of loaderScripts()) script.remove();
	});

	it("creates the official queue and enqueues the default init call", () => {
		const cal = initializeCalEmbed(calWindow);

		expect(cal.loaded).toBe(true);
		expect(cal.ns).toEqual({});
		expect(queuedCalls(cal)).toEqual([["init", { origin: CAL_EMBED_ORIGIN }], ["-ready"]]);
	});

	it("loads the external script exactly once", () => {
		initializeCalEmbed(calWindow);
		initializeCalEmbed(calWindow);

		expect(loaderScripts()).toHaveLength(1);
	});

	it("reuses the stub and safely queues repeated initialization", () => {
		const first = initializeCalEmbed(calWindow);
		const second = initializeCalEmbed(calWindow);

		expect(second).toBe(first);
		expect(queuedCalls(second)).toEqual([
			["init", { origin: CAL_EMBED_ORIGIN }],
			["-ready"],
			["init", { origin: CAL_EMBED_ORIGIN }],
			["-ready"],
		]);
	});
});
