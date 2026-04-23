import { getToken } from "@mmailaender/convex-better-auth-svelte/sveltekit";
import type { Cookies } from "@sveltejs/kit";
import { error } from "@sveltejs/kit";
import { ConvexHttpClient } from "convex/browser";
import { api } from "$convex/api";
import { env as publicEnv } from "$env/dynamic/public";

/**
 * Verify the request has a valid Better Auth session.
 *
 * Audit C12: previously the admin layout loader `+layout.server.ts` did zero
 * server-side auth — it called `api.platform.checkTier` and returned `tier`
 * and `isCreator` to any unauthenticated visitor. Child loaders likewise ran
 * without session validation. Browser-side gates in admin-dashboard's
 * AuthGuard don't protect the data fetched by `+*.server.ts`; this does.
 *
 * Flow: read the Better Auth cookie → hit Convex's `api.adminAuth.whoami`
 * with the token. Convex parses the JWT with its configured public key and
 * returns null if it's expired, tampered with, or the session is revoked.
 * If that check fails, we throw 401 here. Fail-closed on any error path
 * (missing env, network hiccup, etc.) so the loader never silently falls
 * through to render admin data.
 *
 * Throws 401 if:
 *   - no cookie is present
 *   - the cookie is present but Convex rejects it
 *   - the Convex call itself throws
 *
 * Returns the validated session token. Callers that need the identity
 * (email, subject, etc.) should use `requireAuthWithIdentity` instead.
 */
export async function requireAuth(cookies: Cookies): Promise<string> {
	const { token } = await requireAuthWithIdentity(cookies);
	return token;
}

/**
 * Same as `requireAuth` but also returns the resolved identity. Prefer this
 * when the caller needs the user's email or subject for logging or further
 * authorization checks.
 */
export async function requireAuthWithIdentity(cookies: Cookies): Promise<{
	token: string;
	identity: { email: string | null; name: string | null; subject: string };
}> {
	const token = getToken(cookies);
	if (!token) {
		throw error(401, "Unauthorized");
	}
	const convexUrl = publicEnv.PUBLIC_CONVEX_URL;
	if (!convexUrl) {
		// Misconfigured deployment — fail closed.
		throw error(500, "Auth backend not configured");
	}
	const client = new ConvexHttpClient(convexUrl);
	client.setAuth(token);
	try {
		const identity = await client.query(api.adminAuth.whoami, {});
		if (!identity) {
			throw error(401, "Unauthorized");
		}
		return { token, identity };
	} catch (err) {
		if (err && typeof err === "object" && "status" in err) throw err;
		throw error(401, "Unauthorized");
	}
}
