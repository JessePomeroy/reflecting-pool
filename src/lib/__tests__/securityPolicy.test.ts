import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { contentSecurityPolicy } from "$lib/config/securityPolicy.js";
import svelteConfig from "../../../svelte.config.js";

interface VercelHeader {
	key: string;
	value: string;
}

interface VercelConfig {
	headers?: Array<{
		source: string;
		headers: VercelHeader[];
	}>;
}

const expectedDeploymentHeaders = new Map([
	["Content-Security-Policy", "frame-ancestors 'none'"],
	["Permissions-Policy", "camera=(), microphone=(), geolocation=()"],
	["Referrer-Policy", "strict-origin-when-cross-origin"],
	["X-Content-Type-Options", "nosniff"],
	["X-Frame-Options", "DENY"],
]);

describe("production security policy", () => {
	it("lets SvelteKit hash or nonce the resource policy", () => {
		expect(svelteConfig.kit?.csp).toEqual({
			mode: "auto",
			directives: contentSecurityPolicy,
		});
	});

	it("keeps executable scripts nonce/hash compatible", () => {
		expect(contentSecurityPolicy["script-src"]).toEqual([
			"self",
			"https://challenges.cloudflare.com",
			"https://app.cal.com",
		]);
		expect(contentSecurityPolicy["script-src"]).not.toContain("unsafe-inline");
		expect(contentSecurityPolicy["script-src-attr"]).toEqual(["none"]);
	});

	it("preserves each confirmed cross-origin browser boundary", () => {
		expect(contentSecurityPolicy).toMatchObject({
			"style-src": ["self", "unsafe-inline", "https://fonts.googleapis.com"],
			"font-src": ["self", "https://fonts.gstatic.com"],
			"img-src": expect.arrayContaining([
				"data:",
				"blob:",
				"https://cdn.sanity.io",
				"https://gallery-worker.thinkingofview.workers.dev",
			]),
			"connect-src": expect.arrayContaining([
				"https://*.convex.cloud",
				"wss://*.convex.cloud",
				"https://*.sentry.io",
				"https://gallery-worker.thinkingofview.workers.dev",
			]),
			"frame-src": ["https://challenges.cloudflare.com", "https://cal.com", "https://app.cal.com"],
			"form-action": ["self", "https://gallery-worker.thinkingofview.workers.dev"],
		});
	});

	it("applies universal deployment headers to every route", () => {
		const config = JSON.parse(
			readFileSync(new URL("../../../vercel.json", import.meta.url), "utf8"),
		) as VercelConfig;
		const wildcard = config.headers?.find(({ source }) => source === "/(.*)");

		expect(wildcard).toBeDefined();
		expect(new Map(wildcard?.headers.map(({ key, value }) => [key, value]))).toEqual(
			expectedDeploymentHeaders,
		);
	});
});
