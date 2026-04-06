import { relative, sep } from "node:path";
import adapter from "@sveltejs/adapter-auto";

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
		// adapter-auto only supports some environments, see https://svelte.dev/docs/kit/adapter-auto for a list.
		// If your environment is not supported, or you settled on a specific environment, switch out the adapter.
		// See https://svelte.dev/docs/kit/adapters for more information about adapters.
		adapter: adapter(),
		// CSRF protection is enabled by default via origin checks on cross-origin
		// form submissions. JSON POSTs are inherently CSRF-safe (fetch + custom
		// Content-Type triggers a CORS preflight we do not permit). Webhooks
		// (e.g. /api/webhooks/stripe) validate a provider signature out of band.
		// To permit additional origins in future, use `csrf: { trustedOrigins: [...] }`.
	},
};

export default config;
