import { fetchModelingPageContent } from "$lib/server/sanity";

export async function load() {
	return {
		modeling: await fetchModelingPageContent(),
	};
}
