import type { PageServerLoad } from "./$types";

/**
 * Admin dashboard home loader. Auth is enforced in `+layout.server.ts`
 * (which sets `data.isAuthenticated`); unauthenticated visitors get the
 * login form rendered by `<AuthGuard>` on the client, so this loader
 * short-circuits to avoid leaking data or burning Convex calls.
 */
export const load: PageServerLoad = async ({ parent }) => {
	const { isAuthenticated } = await parent();
	if (!isAuthenticated) {
		return { newInquiryCount: 0 };
	}

	return {
		newInquiryCount: 0,
	};
};
