/**
 * SvelteKit client hooks.
 *
 * Initializes Sentry on the browser side and routes uncaught client errors
 * through Sentry.handleErrorWithSentry. Safe no-op when PUBLIC_SENTRY_DSN
 * is empty.
 */

import * as Sentry from "@sentry/sveltekit";
import type { HandleClientError } from "@sveltejs/kit";
import { env } from "$env/dynamic/public";

Sentry.init({
	dsn: env.PUBLIC_SENTRY_DSN,
	initialScope: {
		tags: { site: "reflecting-pool" },
	},
	tracesSampleRate: 0,
	sendDefaultPii: false,
});

const sentryHandleError = Sentry.handleErrorWithSentry();
const handleClientErrorWithSentry = sentryHandleError as HandleClientError;

export const handleError: HandleClientError = (input) => {
	const msg = input.error instanceof Error ? input.error.message : "";
	if (msg.includes("Failed to fetch dynamically imported module")) {
		// After a deploy, old chunk hashes no longer exist on the server.
		// A full reload lets the browser fetch the current entry point.
		window.location.reload();
		return;
	}
	return handleClientErrorWithSentry(input);
};
