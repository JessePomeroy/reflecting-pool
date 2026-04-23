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
		alias: {
			// Convex schema + generated types live in the angelsrest monorepo and
			// are consumed here via @jessepomeroy/crm-api (linked via
			// `link:../angelsrest/packages/crm-api` in package.json). SvelteKit
			// aliases are resolved as filesystem paths, not package specifiers,
			// so we point at node_modules/ directly — pnpm's link creates a
			// symlink there that TS + Vite both follow.
			$convex: "./node_modules/@jessepomeroy/crm-api/src",
		},
	},
};

export default config;
