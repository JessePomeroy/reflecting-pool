import { error } from "@sveltejs/kit";
import { fetchCollectionWithPrints } from "$lib/server/sanity";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ params }) => {
	const result = await fetchCollectionWithPrints(params.slug);

	if (!result) {
		error(404, "Collection not found");
	}

	return {
		collection: result.collection,
		prints: result.prints,
	};
};
