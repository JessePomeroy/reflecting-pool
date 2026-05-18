import { error } from "@sveltejs/kit";
import { fetchPrintProduct } from "$lib/server/content/shopCatalog";
import { V2_PAPERS, V2_SIZES } from "$lib/shop/printCatalog";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ params }) => {
	const product = await fetchPrintProduct(params.slug);

	if (!product) {
		error(404, "Print not found");
	}

	return {
		product,
		paperOptions: V2_PAPERS,
		sizes: V2_SIZES,
	};
};
