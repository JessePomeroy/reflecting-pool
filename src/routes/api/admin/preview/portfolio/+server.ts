import { getAuthenticatedConvex } from "@jessepomeroy/admin/server";
import { error, json } from "@sveltejs/kit";
import { api } from "$convex/api";
import type { Id } from "$convex/dataModel";
import { env as privateEnv } from "$env/dynamic/private";
import "$lib/server/adminHandler";
import {
	createPortfolioPreviewGrant,
	PORTFOLIO_PREVIEW_COOKIE,
	PORTFOLIO_PREVIEW_PATH,
	PORTFOLIO_PREVIEW_TTL_SECONDS,
} from "$lib/server/portfolioPreviewGrant";
import { verifySiteAdminRequest } from "$lib/server/siteAdminAuthorization";
import type { RequestHandler } from "./$types";

export const POST: RequestHandler = async ({ request, cookies, url }) => {
	if (!(await verifySiteAdminRequest(request))) {
		return json({ error: "Unauthorized" }, { status: 401 });
	}

	let input: { galleryId?: unknown; draftRevisionId?: unknown };
	try {
		input = await request.json();
	} catch {
		return json({ error: "Invalid preview request" }, { status: 400 });
	}
	if (typeof input.galleryId !== "string" || typeof input.draftRevisionId !== "string") {
		return json({ error: "Invalid preview request" }, { status: 400 });
	}

	try {
		const client = await getAuthenticatedConvex(request);
		const state = await client.query(api.portfolioGalleries.getEditorState, {
			galleryId: input.galleryId as Id<"portfolioGalleries">,
		});
		if (state.draft?.revisionId !== input.draftRevisionId) {
			return json({ error: "The saved draft changed. Reload before previewing." }, { status: 409 });
		}
		const token = await createPortfolioPreviewGrant(privateEnv.CMS_PREVIEW_SECRET ?? "", {
			siteUrl: "zippymiggy.com",
			galleryId: state.galleryId,
			draftRevisionId: state.draft.revisionId,
		});
		cookies.set(PORTFOLIO_PREVIEW_COOKIE, token, {
			path: PORTFOLIO_PREVIEW_PATH,
			httpOnly: true,
			secure: url.protocol === "https:",
			sameSite: "lax",
			maxAge: PORTFOLIO_PREVIEW_TTL_SECONDS,
		});
		return json(
			{ previewUrl: PORTFOLIO_PREVIEW_PATH },
			{ headers: { "Cache-Control": "no-store" } },
		);
	} catch (cause) {
		if (cause && typeof cause === "object" && "status" in cause) throw cause;
		console.error("cms.portfolio_preview_grant_failed", {
			site: "zippymiggy.com",
			code:
				cause instanceof Error && cause.message.includes("secret") ? "configuration" : "upstream",
		});
		throw error(500, "Could not create the draft preview");
	}
};
