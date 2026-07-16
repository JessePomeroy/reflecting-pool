import { fetchHomepageContent } from "$lib/server/content/homepageQuoteProvider";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ setHeaders }) => {
	setHeaders({ "Cache-Control": "no-store" });
	return {
		homepage: await fetchHomepageContent(),
	};
};
