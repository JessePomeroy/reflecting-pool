import { createSignedPreviewGrant, verifySignedPreviewGrant } from "$lib/server/signedPreviewGrant";

export const MODELING_PAGE_PREVIEW_COOKIE = "cms_modeling_page_preview";
export const MODELING_PAGE_PREVIEW_PATH = "/preview/modeling-page";
export const MODELING_PAGE_PREVIEW_SCOPE = "modeling-page-draft-preview";
export const MODELING_PAGE_PREVIEW_TTL_SECONDS = 10 * 60;

export interface ModelingPagePreviewGrant {
	scope: typeof MODELING_PAGE_PREVIEW_SCOPE;
	siteUrl: string;
	draftRevisionId: string;
	iat: number;
	exp: number;
}

export async function createModelingPagePreviewGrant(
	secret: string,
	input: Pick<ModelingPagePreviewGrant, "siteUrl" | "draftRevisionId">,
	now = Date.now(),
) {
	return await createSignedPreviewGrant(
		secret,
		{ scope: MODELING_PAGE_PREVIEW_SCOPE, ...input },
		MODELING_PAGE_PREVIEW_TTL_SECONDS,
		now,
	);
}

export async function verifyModelingPagePreviewGrant(
	secret: string,
	token: string | undefined,
	expectedSiteUrl: string,
	now = Date.now(),
): Promise<ModelingPagePreviewGrant | null> {
	const payload = await verifySignedPreviewGrant(
		secret,
		token,
		{
			scope: MODELING_PAGE_PREVIEW_SCOPE,
			siteUrl: expectedSiteUrl,
			ttlSeconds: MODELING_PAGE_PREVIEW_TTL_SECONDS,
		},
		now,
	);
	if (!payload || typeof payload.draftRevisionId !== "string" || !payload.draftRevisionId) {
		return null;
	}
	return payload as unknown as ModelingPagePreviewGrant;
}
