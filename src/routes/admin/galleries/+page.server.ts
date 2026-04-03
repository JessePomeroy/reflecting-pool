import { getMockGalleries } from "$lib/admin/data";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async () => {
	// TODO: Add auth middleware — check for admin session/cookie before allowing access

	const galleries = getMockGalleries();

	return { galleries };
};
