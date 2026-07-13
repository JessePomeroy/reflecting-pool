/**
 * SvelteKit Server Hooks
 *
 * Request scoping and server error capture through @sentry/node.
 *
 * Universal response headers live in vercel.json so the same policy covers
 * prerendered files, dynamic pages, and Better Auth API responses. SvelteKit's
 * CSP configuration separately owns per-page nonces and hashes.
 * Admin auth is enforced both server-side (via `$lib/server/adminAuth.ts`
 * called from admin loaders) and client-side (via Better Auth AuthGuard in
 * the admin dashboard package).
 *
 * The Sentry init itself lives in `src/instrumentation.server.ts` (loaded
 * by SvelteKit's experimental.instrumentation.server hook). This file only
 * captures unexpected server errors.
 */

import { captureException, flush, withIsolationScope } from "@sentry/node";
import type { Handle, HandleServerError } from "@sveltejs/kit";

export const handle: Handle = (input) =>
	withIsolationScope((scope) => {
		scope.setTag("route", input.event.route.id ?? input.event.url.pathname);
		scope.setTag("method", input.event.request.method);
		return input.resolve(input.event);
	});

function isExpectedClientError(input: Parameters<HandleServerError>[0]): boolean {
	if (input.status >= 400 && input.status < 500) return true;

	const hasNoRouteId = !input.event.route?.id;
	const stack = input.error instanceof Error ? input.error.stack : "";
	return hasNoRouteId && Boolean(stack?.startsWith("Error: Not found:"));
}

export const handleError: HandleServerError = async (input) => {
	if (!isExpectedClientError(input)) {
		captureException(input.error, {
			mechanism: {
				type: "auto.function.sveltekit.handle_error",
				handled: false,
			},
		});
		await flush(2000);
	}

	if (input.error instanceof Error) {
		console.error(input.error.stack);
	} else {
		console.error(input.error);
	}
};
