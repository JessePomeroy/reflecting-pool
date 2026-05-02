/**
 * SvelteKit Server Hooks
 *
 * Security headers, auth route handling, and Sentry request wrapping.
 * Admin auth is enforced both server-side (via `$lib/server/adminAuth.ts`
 * called from admin loaders, audit C12) and client-side (via Better Auth
 * AuthGuard in the admin dashboard package).
 *
 * Sentry init runs at module load (below). Safe no-op when
 * PUBLIC_SENTRY_DSN is empty — the SDK silently disables capture if dsn
 * is falsy, so unconfigured environments (local dev without a Sentry
 * project, CI, fresh forks) keep working without errors.
 *
 * Why init here instead of `src/instrumentation.server.ts`: the
 * instrumentation hook requires adapter support that this project's
 * SvelteKit + adapter-vercel chain doesn't currently advertise — the
 * vite build fails silently when `instrumentation.server.ts` is present.
 * Module-load init at the top of hooks.server.ts is the documented
 * fallback pattern from Sentry's SvelteKit guide and is functionally
 * equivalent for our case (error capture only, no perf tracing).
 */

import * as Sentry from "@sentry/sveltekit";
import type { Handle } from "@sveltejs/kit";
import { sequence } from "@sveltejs/kit/hooks";
import { env } from "$env/dynamic/public";

Sentry.init({
	dsn: env.PUBLIC_SENTRY_DSN,
	initialScope: {
		tags: { site: "reflecting-pool" },
	},
	// Error capture only. Performance, replays, profiling all off to keep
	// us under the 5K events/month free-tier ceiling.
	tracesSampleRate: 0,
	// Don't capture PII by default — order webhooks contain customer
	// emails and addresses. Attach scrubbed context manually if needed.
	sendDefaultPii: false,
});

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
