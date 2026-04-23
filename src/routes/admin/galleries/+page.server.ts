import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ parent }) => {
	// Auth is enforced in `+layout.server.ts` via `data.isAuthenticated`.
	// Unauthenticated callers see the login form; this loader short-circuits
	// so we don't leak data or burn a Convex call.
	const { isAuthenticated } = await parent();
	if (!isAuthenticated) return { galleries: [] };
	return { galleries: [] };
};
