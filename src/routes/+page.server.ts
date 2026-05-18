import { fetchHomepageContent } from "$lib/server/content/homepage";
import type { PageServerLoad } from "./$types";

export const prerender = true;

export const load: PageServerLoad = async () => {
	return {
		homepage: await fetchHomepageContent(),
	};
};
