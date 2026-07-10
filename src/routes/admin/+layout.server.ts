import { getTenantAdminLayoutData } from "@jessepomeroy/admin";
import { ConvexHttpClient } from "convex/browser";
import { api } from "$convex/api";
import { env } from "$env/dynamic/public";
import { adminConfig } from "$lib/config/admin";
import { requireAuthWithIdentity } from "$lib/server/adminAuth";
import type { LayoutServerLoad } from "./$types";

let _convex: ConvexHttpClient | null = null;
function getConvex() {
	if (!_convex) {
		_convex = new ConvexHttpClient(env.PUBLIC_CONVEX_URL || "");
	}
	return _convex;
}

/**
 * Server-side auth gate for /admin/**. Browser-side `<AuthGuard>` controls
 * rendering, while this loader independently validates the Better Auth
 * session before it reads or returns admin data.
 *
 * We don't redirect to a login URL — there isn't a dedicated /login route
 * in this app; the AuthGuard component renders `<LoginPage>` inline when
 * it sees no session. So on validation failure, we return an
 * `adminSession.status` of `unauthenticated`. The client-side AuthGuard
 * handles the login flow; child +page.server.ts loaders read the normalized
 * session state and skip their data fetches when it is not authorized.
 *
 * `+layout.svelte` also derives `setupAuth` from `adminSession.status` —
 * server-validated identity instead of the flickery `authClient.useSession()`
 * subscription that re-introduces the old Better Auth session-pause bug.
 */
export const load: LayoutServerLoad = async ({ cookies }) => {
	let identity: { email: string | null } | null = null;
	try {
		({ identity } = await requireAuthWithIdentity(cookies));
	} catch {
		return getTenantAdminLayoutData({ status: "unauthenticated" });
	}

	// Only fetch tier for authenticated callers — a stray `checkTier` on
	// every anonymous hit would be both a data leak and wasted work.
	const convex = getConvex();
	const result = await convex.query(api.platform.checkTier, {
		siteUrl: adminConfig.siteUrl,
	});

	return getTenantAdminLayoutData({
		status: "authorized",
		email: identity.email,
		tier: result.tier,
		isCreator: false,
	});
};
