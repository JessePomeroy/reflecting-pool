import { getAuthenticatedConvex } from "@jessepomeroy/admin/server";
import { error } from "@sveltejs/kit";
import { api } from "$convex/api";
import type { Id } from "$convex/dataModel";
import { env as privateEnv } from "$env/dynamic/private";
import { adminConfig } from "$lib/config/admin";
import {
	MODELING_PAGE_PREVIEW_COOKIE,
	MODELING_PAGE_PREVIEW_PATH,
	type ModelingPagePreviewGrant,
	verifyModelingPagePreviewGrant,
} from "$lib/server/modelingPagePreviewGrant";
import "$lib/server/adminHandler";
import { fetchLegacyModelingPageContent } from "$lib/server/content/modeling";
import {
	composeModelingPageDraftResult,
	type ModelingEditorMediaAsset,
} from "$lib/server/content/modelingPageProvider";
import { verifySiteAdminRequest } from "$lib/server/siteAdminAuthorization";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ request, cookies, setHeaders }) => {
	setHeaders({ "Cache-Control": "private, no-store" });
	let grant: ModelingPagePreviewGrant | null;
	try {
		grant = await verifyModelingPagePreviewGrant(
			privateEnv.CMS_PREVIEW_SECRET ?? "",
			cookies.get(MODELING_PAGE_PREVIEW_COOKIE),
			adminConfig.siteUrl,
		);
	} catch {
		console.error("cms.modeling_page_preview_failed", {
			site: adminConfig.siteUrl,
			code: "configuration",
		});
		throw error(500, "Modeling draft preview is not configured");
	}
	if (!grant) {
		cookies.delete(MODELING_PAGE_PREVIEW_COOKIE, { path: MODELING_PAGE_PREVIEW_PATH });
		throw error(403, "This draft preview has expired or is invalid.");
	}
	if (!(await verifySiteAdminRequest(request))) {
		throw error(401, "Sign in to view this draft preview.");
	}

	const client = await getAuthenticatedConvex(request);
	const state = await client.query(api.content.getModelingPageEditorState, {
		siteUrl: adminConfig.siteUrl,
	});
	if (!state?.draft || state.draft.revisionId !== grant.draftRevisionId) {
		throw error(409, "This draft changed after the preview was created. Open a new preview.");
	}
	const assetIds = [
		...new Set([
			...(state.draft.payload.galleries ?? []).flatMap((gallery) =>
				(gallery.images ?? []).map((image) => image.assetId),
			),
		]),
	] as Id<"mediaAssets">[];
	const [assets, legacy] = await Promise.all([
		client.query(api.mediaAssets.getManyForEditor, {
			siteUrl: adminConfig.siteUrl,
			ids: assetIds,
		}) as Promise<ModelingEditorMediaAsset[]>,
		fetchLegacyModelingPageContent(),
	]);
	return {
		modeling: composeModelingPageDraftResult(legacy, state.draft.payload, assets),
	};
};
