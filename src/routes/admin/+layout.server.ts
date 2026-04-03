import type { LayoutServerLoad } from "./$types";
// import { requireAdmin } from '$lib/server/auth';

export const load: LayoutServerLoad = async (event) => {
	// TODO: Uncomment when ready to enforce auth
	// requireAdmin(event);
	return {};
};
