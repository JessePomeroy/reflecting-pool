/**
 * SvelteKit Server Hooks
 *
 * Security headers, auth route handling, and Sentry request wrapping.
 * Admin auth is enforced both server-side (via `$lib/server/adminAuth.ts`
 * called from admin loaders, audit C12) and client-side (via Better Auth
 * AuthGuard in the admin dashboard package).
 *
 * The Sentry init itself lives in `src/instrumentation.server.ts` (loaded
 * by SvelteKit's experimental.instrumentation.server hook). Here we just
 * wrap the request handler so Sentry can attach to spans/errors per
 * request.
 */

import * as Sentry from "@sentry/sveltekit";
import type { Handle } from "@sveltejs/kit";
import { sequence } from "@sveltejs/kit/hooks";

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

export const handle = sequence(Sentry.sentryHandle(), appHandle);

export const handleError = Sentry.handleErrorWithSentry();
