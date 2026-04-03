import { fetchCollections, fetchPrintableProducts } from "$lib/server/sanity";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async () => {
	const [collections, products] = await Promise.all([fetchCollections(), fetchPrintableProducts()]);

	return {
		collections,
		products,
	};
};
