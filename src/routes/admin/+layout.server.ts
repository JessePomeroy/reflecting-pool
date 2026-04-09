import { ConvexHttpClient } from "convex/browser";
import { api } from "$convex/api";
import { env } from "$env/dynamic/public";
import { adminConfig } from "$lib/config/admin";
import type { LayoutServerLoad } from "./$types";

let _convex: ConvexHttpClient | null = null;
function getConvex() {
	if (!_convex) {
		_convex = new ConvexHttpClient(env.PUBLIC_CONVEX_URL || "");
	}
	return _convex;
}

export const load: LayoutServerLoad = async () => {
	const convex = getConvex();
	const result = await convex.query(api.platform.checkTier, { siteUrl: adminConfig.siteUrl });

	return {
		tier: result.tier,
		isCreator: false,
	};
};
