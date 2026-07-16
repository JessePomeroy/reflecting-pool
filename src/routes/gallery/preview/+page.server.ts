import { getAuthenticatedConvex } from "@jessepomeroy/admin/server";
import { error } from "@sveltejs/kit";
import { api } from "$convex/api";
import type { Id } from "$convex/dataModel";
import { env as privateEnv } from "$env/dynamic/private";
import "$lib/server/adminHandler";
import { portfolioDraftPreviewCluster } from "$lib/server/content/portfolioPreview";
import {
	PORTFOLIO_PREVIEW_COOKIE,
	PORTFOLIO_PREVIEW_PATH,
	type PortfolioPreviewGrant,
	verifyPortfolioPreviewGrant,
} from "$lib/server/portfolioPreviewGrant";
import { verifySiteAdminRequest } from "$lib/server/siteAdminAuthorization";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ request, cookies, setHeaders }) => {
	setHeaders({ "Cache-Control": "private, no-store" });
	let grant: PortfolioPreviewGrant | null;
	try {
		grant = await verifyPortfolioPreviewGrant(
			privateEnv.CMS_PREVIEW_SECRET ?? "",
			cookies.get(PORTFOLIO_PREVIEW_COOKIE),
			"zippymiggy.com",
		);
	} catch {
		console.error("cms.portfolio_preview_failed", {
			site: "zippymiggy.com",
			code: "configuration",
		});
		throw error(500, "Draft preview is not configured");
	}
	if (!grant) {
		cookies.delete(PORTFOLIO_PREVIEW_COOKIE, { path: PORTFOLIO_PREVIEW_PATH });
		throw error(403, "This draft preview has expired or is invalid.");
	}
	if (!(await verifySiteAdminRequest(request)))
		throw error(401, "Sign in to view this draft preview.");

	const client = await getAuthenticatedConvex(request);
	const state = await client.query(api.portfolioGalleries.getEditorState, {
		galleryId: grant.galleryId as Id<"portfolioGalleries">,
	});
	if (state.draft?.revisionId !== grant.draftRevisionId) {
		throw error(409, "This draft changed after the preview was created. Open a new preview.");
	}
	const ids = [...new Set(state.draft.placements.map((placement) => placement.assetId))];
	const assets = await client.query(api.mediaAssets.getManyForEditor, {
		siteUrl: grant.siteUrl,
		ids,
	});
	return {
		preview: {
			revisionId: grant.draftRevisionId,
			cluster: portfolioDraftPreviewCluster({
				galleryId: state.galleryId,
				title: state.draft.title ?? "",
				slug: state.draft.slug,
				placements: state.draft.placements,
				assets,
			}),
		},
	};
};
