import { getAuthenticatedConvex } from "@jessepomeroy/admin/server";
import { error } from "@sveltejs/kit";
import { api } from "$convex/api";
import type { Id } from "$convex/dataModel";
import { env as privateEnv } from "$env/dynamic/private";
import { adminConfig } from "$lib/config/admin";
import {
	ABOUT_PAGE_PREVIEW_COOKIE,
	ABOUT_PAGE_PREVIEW_PATH,
	type AboutPagePreviewGrant,
	verifyAboutPagePreviewGrant,
} from "$lib/server/aboutPagePreviewGrant";
import "$lib/server/adminHandler";
import { fetchLegacyAboutContent } from "$lib/server/content/about";
import {
	type AboutEditorMediaAsset,
	composeAboutPageDraftResult,
} from "$lib/server/content/aboutPageProvider";
import { fetchSiteSettings } from "$lib/server/content/siteSettingsProvider";
import { verifySiteAdminRequest } from "$lib/server/siteAdminAuthorization";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ request, cookies, setHeaders }) => {
	setHeaders({ "Cache-Control": "private, no-store" });
	let grant: AboutPagePreviewGrant | null;
	try {
		grant = await verifyAboutPagePreviewGrant(
			privateEnv.CMS_PREVIEW_SECRET ?? "",
			cookies.get(ABOUT_PAGE_PREVIEW_COOKIE),
			adminConfig.siteUrl,
		);
	} catch {
		console.error("cms.about_page_preview_failed", {
			site: adminConfig.siteUrl,
			code: "configuration",
		});
		throw error(500, "About draft preview is not configured");
	}
	if (!grant) {
		cookies.delete(ABOUT_PAGE_PREVIEW_COOKIE, { path: ABOUT_PAGE_PREVIEW_PATH });
		throw error(403, "This draft preview has expired or is invalid.");
	}
	if (!(await verifySiteAdminRequest(request))) {
		throw error(401, "Sign in to view this draft preview.");
	}

	const client = await getAuthenticatedConvex(request);
	const state = await client.query(api.content.getAboutPageEditorState, {
		siteUrl: adminConfig.siteUrl,
	});
	if (state?.draft?.revisionId !== grant.draftRevisionId) {
		throw error(409, "This draft changed after the preview was created. Open a new preview.");
	}
	const assetIds = [
		...new Set([
			...(state.draft.payload.portraits ?? []).map((portrait) => portrait.assetId),
			...(state.draft.payload.seoImageAssetId ? [state.draft.payload.seoImageAssetId] : []),
		]),
	] as Id<"mediaAssets">[];
	const [assets, legacy, settings] = await Promise.all([
		client.query(api.mediaAssets.getManyForEditor, {
			siteUrl: adminConfig.siteUrl,
			ids: assetIds,
		}) as Promise<AboutEditorMediaAsset[]>,
		fetchLegacyAboutContent(),
		fetchSiteSettings(),
	]);
	return {
		about: composeAboutPageDraftResult(legacy, state.draft.payload, assets),
		settings,
	};
};
