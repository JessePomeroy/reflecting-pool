import type { InquiryUI } from "@jessepomeroy/admin";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ parent }): Promise<{ inquiries: InquiryUI[] }> => {
	// Auth is enforced in `+layout.server.ts` via `data.isAuthenticated`.
	// Unauthenticated callers see the login form; this loader short-circuits
	// so we don't leak data or burn a Convex call.
	const { isAuthenticated } = await parent();
	if (!isAuthenticated) return { inquiries: [] };

	// Reflecting-pool inquiries belong in Convex, not Sanity. Until H42c ports
	// the inquiries module into the shared CRM API, hand back an empty list so
	// `<InquiriesPage>` renders without type errors. When H42c lands, mirror
	// angelsrest's pattern and call `api.inquiries.list` here.
	return { inquiries: [] };
};
