import { relative, sep } from "node:path";
// Pinned to adapter-vercel (not adapter-auto) for two reasons:
// 1. reflecting-pool deploys to Vercel; adapter-auto's auto-detection is
//    a leak in the abstraction we don't need.
// 2. The experimental.instrumentation.server flag below (Sentry init)
//    requires an adapter that explicitly declares instrumentation
//    support — adapter-auto cannot promise that at build time.
import adapter from "@sveltejs/adapter-vercel";
import { contentSecurityPolicy } from "./src/lib/config/securityPolicy.js";

/** @type {import('@sveltejs/kit').Config} */
const config = {
	compilerOptions: {
		// defaults to rune mode for the project, except for `node_modules`. Can be removed in svelte 6.
		runes: ({ filename }) => {
			const relativePath = relative(import.meta.dirname, filename);
			const pathSegments = relativePath.toLowerCase().split(sep);
			const isExternalLibrary = pathSegments.includes("node_modules");

			return isExternalLibrary ? undefined : true;
		},
	},
	kit: {
		// SvelteKit can nonce dynamic HTML and hash prerendered HTML. Keep this
		// resource policy here rather than weakening script-src for a static
		// deployment header; universal response headers live in vercel.json.
		csp: {
			mode: "auto",
			directives: contentSecurityPolicy,
		},
		// Pin runtime + maxDuration explicitly so Vercel defaults cannot change
		// webhook behavior. Node 22 matches package/CI requirements; the longer
		// request budget covers Stripe and LumaPrints round trips.
		adapter: adapter({
			runtime: "nodejs22.x",
			maxDuration: 30,
		}),
		alias: {
			// Convex schema + generated types are published by the Angels Rest
			// `@jessepomeroy/crm-api` package. SvelteKit aliases resolve filesystem
			// paths, so point at the installed package source.
			$convex: "./node_modules/@jessepomeroy/crm-api/src",
		},
		experimental: {
			// Required for src/instrumentation.server.ts to be loaded at
			// server startup. Without this flag, SvelteKit silently ignores
			// the instrumentation file and Sentry init never runs — and
			// the vite build fails with no error message.
			instrumentation: {
				server: true,
			},
		},
	},
};

export default config;
