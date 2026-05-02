import { relative, sep } from "node:path";
// Pinned to adapter-vercel (not adapter-auto) for two reasons:
// 1. reflecting-pool deploys to Vercel; adapter-auto's auto-detection is
//    a leak in the abstraction we don't need.
// 2. The experimental.instrumentation.server flag below (Sentry init)
//    requires an adapter that explicitly declares instrumentation
//    support — adapter-auto cannot promise that at build time.
import adapter from "@sveltejs/adapter-vercel";

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
		// Pin runtime + maxDuration explicitly. Without these, Vercel uses
		// its evolving defaults — which have bitten the Stripe webhook on
		// the hub repo before when the implicit function timeout shortened
		// (audit H47). nodejs22.x matches the `node-version: 22` used in
		// CI; 30s is generous for webhook + LumaPrints round trips once
		// those land here.
		adapter: adapter({
			runtime: "nodejs22.x",
			maxDuration: 30,
		}),
		alias: {
			// Convex schema + generated types live in the angelsrest monorepo and
			// are consumed here via @jessepomeroy/crm-api (linked via
			// `link:../angelsrest/packages/crm-api` in package.json). SvelteKit
			// aliases are resolved as filesystem paths, not package specifiers,
			// so we point at node_modules/ directly — pnpm's link creates a
			// symlink there that TS + Vite both follow.
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
