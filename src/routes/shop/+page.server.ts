import { fetchPrintableProducts } from "$lib/server/sanity";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async () => {
	const products = await fetchPrintableProducts();

	return {
		products,
	};
};
