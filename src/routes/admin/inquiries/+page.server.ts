import type { InquiryUI } from "@jessepomeroy/admin";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ parent }): Promise<{ inquiries: InquiryUI[] }> => {
	// Auth is enforced in `+layout.server.ts` via `data.isAuthenticated`.
	// Unauthenticated callers see the login form; this loader short-circuits
	// so we don't leak data or burn a Convex call.
	const { isAuthenticated } = await parent();
	if (!isAuthenticated) return { inquiries: [] };

	// Reflecting-pool's inquiries live in Sanity (currently mocked — see audit
	// H42). Until Sanity is un-mocked and a real query is wired up, hand back
	// an empty list so `<InquiriesPage>` renders without type errors. When
	// H42 lands, mirror angelsrest's pattern: port `convex/inquiries.ts` and
	// call `api.inquiries.list` here instead.
	return { inquiries: [] };
};
