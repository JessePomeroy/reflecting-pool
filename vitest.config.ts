import { sveltekit } from "@sveltejs/kit/vite";
import path from "path";
import { defineConfig } from "vitest/config";

export default defineConfig({
	plugins: [sveltekit()],
	test: {
		include: ["src/**/*.test.ts"],
		environment: "node",
		globals: true,
		alias: {
			"$env/static/private": path.resolve("./src/__mocks__/env-private.ts"),
			"$env/static/public": path.resolve("./src/__mocks__/env-public.ts"),
			"$app/environment": path.resolve("./src/__mocks__/app-environment.ts"),
		},
	},
});
