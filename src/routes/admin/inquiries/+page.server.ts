import type { InquiryUI } from "@jessepomeroy/admin";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ parent }): Promise<{ inquiries: InquiryUI[] }> => {
	// Auth is normalized in `+layout.server.ts`; only authorized admin
	// sessions should fetch admin data.
	const { adminSession } = await parent();
	if (adminSession.status !== "authorized") return { inquiries: [] };

	// Reflecting-pool inquiries belong in Convex, not Sanity. Until H42c ports
	// the inquiries module into the shared CRM API, hand back an empty list so
	// `<InquiriesPage>` renders without type errors. When H42c lands, mirror
	// angelsrest's pattern and call `api.inquiries.list` here.
	return { inquiries: [] };
};
