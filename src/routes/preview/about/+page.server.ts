import { getAuthenticatedConvex } from "@jessepomeroy/admin/server";
import { error } from "@sveltejs/kit";
import { api } from "$convex/api";
import { env as privateEnv } from "$env/dynamic/private";
import { adminConfig } from "$lib/config/admin";
import {
	CONTACT_PAGE_PREVIEW_COOKIE,
	CONTACT_PAGE_PREVIEW_PATH,
	type ContactPagePreviewGrant,
	verifyContactPagePreviewGrant,
} from "$lib/server/contactPagePreviewGrant";
import { fetchAboutContent } from "$lib/server/content/about";
import { composeContactPageResult } from "$lib/server/content/contactPageProvider";
import { fetchSiteSettings } from "$lib/server/content/siteSettingsProvider";
import "$lib/server/adminHandler";
import { verifySiteAdminRequest } from "$lib/server/siteAdminAuthorization";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ request, cookies, setHeaders }) => {
	setHeaders({ "Cache-Control": "private, no-store" });
	let grant: ContactPagePreviewGrant | null;
	try {
		grant = await verifyContactPagePreviewGrant(
			privateEnv.CMS_PREVIEW_SECRET ?? "",
			cookies.get(CONTACT_PAGE_PREVIEW_COOKIE),
			adminConfig.siteUrl,
		);
	} catch {
		console.error("cms.contact_page_preview_failed", {
			site: adminConfig.siteUrl,
			code: "configuration",
		});
		throw error(500, "Contact draft preview is not configured");
	}
	if (!grant) {
		cookies.delete(CONTACT_PAGE_PREVIEW_COOKIE, { path: CONTACT_PAGE_PREVIEW_PATH });
		throw error(403, "This draft preview has expired or is invalid.");
	}
	if (!(await verifySiteAdminRequest(request))) {
		throw error(401, "Sign in to view this draft preview.");
	}

	const client = await getAuthenticatedConvex(request);
	const state = await client.query(api.content.getContactPageEditorState, {
		siteUrl: adminConfig.siteUrl,
	});
	if (state?.draft?.revisionId !== grant.draftRevisionId) {
		throw error(409, "This draft changed after the preview was created. Open a new preview.");
	}
	const [about, settings] = await Promise.all([fetchAboutContent(), fetchSiteSettings()]);
	return {
		about,
		settings: composeContactPageResult(settings, state.draft.payload),
	};
};
