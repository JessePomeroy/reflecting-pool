import { getAuthenticatedConvex } from "@jessepomeroy/admin/server";
import { error, json } from "@sveltejs/kit";
import { api } from "$convex/api";
import { env as privateEnv } from "$env/dynamic/private";
import { adminConfig } from "$lib/config/admin";
import {
	createHomepageQuotePreviewGrant,
	HOMEPAGE_QUOTE_PREVIEW_COOKIE,
	HOMEPAGE_QUOTE_PREVIEW_PATH,
	HOMEPAGE_QUOTE_PREVIEW_TTL_SECONDS,
} from "$lib/server/homepageQuotePreviewGrant";
import "$lib/server/adminHandler";
import { verifySiteAdminRequest } from "$lib/server/siteAdminAuthorization";
import type { RequestHandler } from "./$types";

export const POST: RequestHandler = async ({ request, cookies, url }) => {
	if (!(await verifySiteAdminRequest(request))) {
		return json({ error: "Unauthorized" }, { status: 401 });
	}

	let input: { draftRevisionId?: unknown };
	try {
		input = await request.json();
	} catch {
		return json({ error: "Invalid preview request" }, { status: 400 });
	}
	if (typeof input.draftRevisionId !== "string") {
		return json({ error: "Invalid preview request" }, { status: 400 });
	}

	try {
		const client = await getAuthenticatedConvex(request);
		const state = await client.query(api.content.getHomepageQuoteEditorState, {
			siteUrl: adminConfig.siteUrl,
		});
		if (state?.draft?.revisionId !== input.draftRevisionId) {
			return json({ error: "The saved draft changed. Reload before previewing." }, { status: 409 });
		}
		const token = await createHomepageQuotePreviewGrant(privateEnv.CMS_PREVIEW_SECRET ?? "", {
			siteUrl: adminConfig.siteUrl,
			draftRevisionId: state.draft.revisionId,
		});
		cookies.set(HOMEPAGE_QUOTE_PREVIEW_COOKIE, token, {
			path: HOMEPAGE_QUOTE_PREVIEW_PATH,
			httpOnly: true,
			secure: url.protocol === "https:",
			sameSite: "lax",
			maxAge: HOMEPAGE_QUOTE_PREVIEW_TTL_SECONDS,
		});
		return json(
			{ previewUrl: HOMEPAGE_QUOTE_PREVIEW_PATH },
			{ headers: { "Cache-Control": "no-store" } },
		);
	} catch (cause) {
		if (cause && typeof cause === "object" && "status" in cause) throw cause;
		console.error("cms.homepage_quote_preview_grant_failed", {
			site: adminConfig.siteUrl,
			code:
				cause instanceof Error && cause.message.includes("secret") ? "configuration" : "upstream",
		});
		throw error(500, "Could not create the Homepage draft preview");
	}
};
