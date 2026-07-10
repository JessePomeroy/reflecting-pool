import { sentrySvelteKit } from "@sentry/sveltekit";
import { sveltekit } from "@sveltejs/kit/vite";
import { defineConfig } from "vite";

// import basicSsl from "@vitejs/plugin-basic-ssl";

const canUploadSentrySourceMaps = Boolean(
	process.env.SENTRY_AUTH_TOKEN && process.env.SENTRY_ORG && process.env.SENTRY_PROJECT,
);

export default defineConfig({
	plugins: [
		sentrySvelteKit({
			// This site uses Sentry for error capture only right now
			// (`tracesSampleRate: 0`). Leaving auto-instrumentation on injects
			// @sentry/sveltekit runtime imports into every server load and makes
			// Vercel trace Sentry's build-time plugin code into the serverless
			// bundle. Re-enable only when we intentionally turn tracing on.
			autoInstrument: false,
			autoUploadSourceMaps: canUploadSentrySourceMaps,
			sourceMapsUploadOptions: canUploadSentrySourceMaps
				? {
						org: process.env.SENTRY_ORG,
						project: process.env.SENTRY_PROJECT,
						authToken: process.env.SENTRY_AUTH_TOKEN,
						telemetry: false,
					}
				: undefined,
		}),
		sveltekit(),
		// basicSsl(),
		// ↑ Enable for iOS gyroscope testing on dev (DeviceOrientationEvent
		// .requestPermission requires a secure context). Disabled by default
		// because it breaks Better Auth flows against the shared Convex dev
		// deployment (SITE_URL there is http://localhost:5173). When testing
		// gyroscope:
		//   1. Uncomment this line + the import above.
		//   2. Update PUBLIC_SITE_URL and SITE_URL in .env to https://.
		//   3. `npx convex env set SITE_URL https://localhost:5173` (remember
		//      to flip back afterwards — angelsrest shares this deployment).
	],
	server: {
		host: true,
		fs: {
			allow: ["convex/_generated"],
		},
	},
	build: {
		// Three.js is lazy-loaded for the interactive/modeling surfaces. Keep
		// warnings focused on chunks larger than that known dependency.
		chunkSizeWarningLimit: 900,
	},
});
