import type { InquiryUI } from "@jessepomeroy/admin";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ parent }): Promise<{ inquiries: InquiryUI[] }> => {
	// Auth is normalized in `+layout.server.ts`; only authorized admin
	// sessions should fetch admin data.
	const { adminSession } = await parent();
	if (adminSession.status !== "authorized") return { inquiries: [] };

	// Inquiries belong in shared Convex, not Sanity. This host has not wired the
	// shared inquiry query yet, so the page is deliberately empty rather than
	// reading from the wrong data source.
	return { inquiries: [] };
};
