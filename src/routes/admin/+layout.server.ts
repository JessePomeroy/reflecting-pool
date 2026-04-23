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
 * Server-side auth gate for /admin/** (audit C12). The admin layout relied
 * entirely on the client-side `<AuthGuard>` before, which meant
 * `+layout.server.ts` handed out `tier` to any unauthenticated caller that
 * hit `/admin`. Validating the session here kills that surface: the server
 * refuses to load admin data unless Convex confirms the Better Auth
 * session is intact.
 *
 * We don't redirect to a login URL — there isn't a dedicated /login route
 * in this app; the AuthGuard component renders `<LoginPage>` inline when
 * it sees no session. So on validation failure, we return
 * `isAuthenticated: false`. The client-side AuthGuard handles the login
 * flow; child +page.server.ts loaders read `isAuthenticated` and skip
 * their data fetches when it's false.
 *
 * `isAuthenticated` is also consumed by `+layout.svelte` to drive
 * `setupAuth`'s state — server-validated identity instead of the flickery
 * `authClient.useSession()` subscription that re-introduces the pause bug
 * in `@mmailaender/convex-better-auth-svelte@0.7.3`.
 */
export const load: LayoutServerLoad = async ({ cookies }) => {
	let isAuthenticated = false;
	try {
		await requireAuthWithIdentity(cookies);
		isAuthenticated = true;
	} catch {
		// Any validation error → fall through as unauthenticated. The
		// client-side AuthGuard renders the login form from here.
		isAuthenticated = false;
	}

	if (!isAuthenticated) {
		return {
			tier: "basic" as const,
			isCreator: false,
			isAuthenticated,
		};
	}

	// Only fetch tier for authenticated callers — a stray `checkTier` on
	// every anonymous hit would be both a data leak and wasted work.
	const convex = getConvex();
	const result = await convex.query(api.platform.checkTier, {
		siteUrl: adminConfig.siteUrl,
	});

	return {
		tier: result.tier,
		isCreator: false,
		isAuthenticated,
	};
};
