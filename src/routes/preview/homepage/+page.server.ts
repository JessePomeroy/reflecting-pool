import { getAuthenticatedConvex } from "@jessepomeroy/admin/server";
import { error } from "@sveltejs/kit";
import { api } from "$convex/api";
import { env as privateEnv } from "$env/dynamic/private";
import { adminConfig } from "$lib/config/admin";
import { fetchLegacyHomepageContent } from "$lib/server/content/homepage";
import {
	HOMEPAGE_QUOTE_PREVIEW_COOKIE,
	HOMEPAGE_QUOTE_PREVIEW_PATH,
	type HomepageQuotePreviewGrant,
	verifyHomepageQuotePreviewGrant,
} from "$lib/server/homepageQuotePreviewGrant";
import "$lib/server/adminHandler";
import { verifySiteAdminRequest } from "$lib/server/siteAdminAuthorization";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ request, cookies, setHeaders }) => {
	setHeaders({ "Cache-Control": "private, no-store" });
	let grant: HomepageQuotePreviewGrant | null;
	try {
		grant = await verifyHomepageQuotePreviewGrant(
			privateEnv.CMS_PREVIEW_SECRET ?? "",
			cookies.get(HOMEPAGE_QUOTE_PREVIEW_COOKIE),
			adminConfig.siteUrl,
		);
	} catch {
		console.error("cms.homepage_quote_preview_failed", {
			site: adminConfig.siteUrl,
			code: "configuration",
		});
		throw error(500, "Homepage draft preview is not configured");
	}
	if (!grant) {
		cookies.delete(HOMEPAGE_QUOTE_PREVIEW_COOKIE, { path: HOMEPAGE_QUOTE_PREVIEW_PATH });
		throw error(403, "This draft preview has expired or is invalid.");
	}
	if (!(await verifySiteAdminRequest(request))) {
		throw error(401, "Sign in to view this draft preview.");
	}

	const client = await getAuthenticatedConvex(request);
	const state = await client.query(api.content.getHomepageQuoteEditorState, {
		siteUrl: adminConfig.siteUrl,
	});
	if (state?.draft?.revisionId !== grant.draftRevisionId) {
		throw error(409, "This draft changed after the preview was created. Open a new preview.");
	}
	const legacy = await fetchLegacyHomepageContent();
	return {
		homepage: {
			...legacy,
			quote: {
				text: state.draft.payload.text ?? "",
				attribution: state.draft.payload.attribution ?? "",
			},
		},
	};
};
