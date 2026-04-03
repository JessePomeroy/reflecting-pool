import { error } from "@sveltejs/kit";
import { fetchPrintProduct } from "$lib/server/sanity";
import { AVAILABLE_SIZES, PAPER_OPTIONS } from "$lib/shop/types";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ params }) => {
	const product = await fetchPrintProduct(params.slug);

	if (!product) {
		error(404, "Print not found");
	}

	return {
		product,
		paperOptions: PAPER_OPTIONS,
		sizes: AVAILABLE_SIZES,
	};
};
