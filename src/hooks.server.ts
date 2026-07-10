/**
 * SvelteKit Server Hooks
 *
 * Security headers, auth route handling, and server error capture through
 * @sentry/node.
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

function addSecurityHeaders(response: Response): Response {
	const cloned = new Response(response.body, response);
	cloned.headers.set("X-Frame-Options", "DENY");
	cloned.headers.set("X-Content-Type-Options", "nosniff");
	cloned.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
	cloned.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
	return cloned;
}

const appHandle: Handle = async ({ event, resolve }) => {
	const response = await resolve(event);

	// Skip security headers for auth API routes. Better Auth sets its own
	// response headers and consumes the body; wrapping here would double-set
	// or corrupt them.
	if (event.url.pathname.startsWith("/api/auth")) {
		return response;
	}

	return addSecurityHeaders(response);
};

export const handle: Handle = (input) =>
	withIsolationScope((scope) => {
		scope.setTag("route", input.event.route.id ?? input.event.url.pathname);
		scope.setTag("method", input.event.request.method);
		return appHandle(input);
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
