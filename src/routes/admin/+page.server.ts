import type { PageServerLoad } from "./$types";

/**
 * Admin dashboard home loader. Auth is normalized in `+layout.server.ts`;
 * only authorized admin sessions should fetch admin data.
 */
export const load: PageServerLoad = async ({ parent }) => {
	const { adminSession } = await parent();
	if (adminSession.status !== "authorized") {
		return { newInquiryCount: 0 };
	}

	return {
		newInquiryCount: 0,
	};
};
