import { fetchHomepageContent } from "$lib/server/sanity";
import type { PageServerLoad } from "./$types";

export const prerender = true;

export const load: PageServerLoad = async () => {
	return {
		homepage: await fetchHomepageContent(),
	};
};
