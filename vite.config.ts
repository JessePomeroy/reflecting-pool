import { sveltekit } from "@sveltejs/kit/vite";
import { defineConfig } from "vite";
// import basicSsl from "@vitejs/plugin-basic-ssl";

export default defineConfig({
	plugins: [
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
});
