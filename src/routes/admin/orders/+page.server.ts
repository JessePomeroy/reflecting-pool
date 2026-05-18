import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ parent }) => {
	// Auth is normalized in `+layout.server.ts`; only authorized admin
	// sessions should fetch admin data.
	const { adminSession } = await parent();
	if (adminSession.status !== "authorized") return {};
	return {};
};
