import { fetchPortfolioClusters } from "$lib/server/content/portfolioProvider";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ setHeaders }) => {
	setHeaders({ "Cache-Control": "no-store" });
	return { clusters: await fetchPortfolioClusters() };
};
