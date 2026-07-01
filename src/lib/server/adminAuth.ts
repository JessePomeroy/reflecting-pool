import { createAdminAuthValidator, createAdminTokenHandler } from "@jessepomeroy/admin/server";
import { getToken } from "@mmailaender/convex-better-auth-svelte/sveltekit";
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
export const adminAuth = createAdminAuthValidator({
	getToken,
	getConvexUrl: () => publicEnv.PUBLIC_CONVEX_URL,
	whoami: api.adminAuth.whoami,
});

export const { requireAuth, requireAuthWithIdentity } = adminAuth;
export const adminTokenHandler = createAdminTokenHandler({ getToken });
