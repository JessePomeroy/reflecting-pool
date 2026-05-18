import { fetchModelingPageContent } from "$lib/server/content/modeling";

export async function load() {
	return {
		modeling: await fetchModelingPageContent(),
	};
}
