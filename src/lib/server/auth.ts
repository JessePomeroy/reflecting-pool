/**
 * Admin auth helpers — backed by Auth.js (Google OAuth with email allowlist).
 * See `src/auth.ts` for the provider config and `src/hooks.server.ts` for
 * how `locals.user.isAdmin` is populated.
 */
import type { RequestEvent } from "@sveltejs/kit";
import { redirect } from "@sveltejs/kit";

/** True if the request carries a valid admin session. */
export function isAdmin(event: RequestEvent): boolean {
	return event.locals.user?.isAdmin === true;
}

/** Redirect to the admin login page when the session is missing or invalid. */
export function requireAdmin(event: RequestEvent): void {
	if (!isAdmin(event)) {
		const next = event.url.pathname + event.url.search;
		throw redirect(302, `/admin/login?next=${encodeURIComponent(next)}`);
	}
}
