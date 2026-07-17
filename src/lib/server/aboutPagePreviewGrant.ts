import { createSignedPreviewGrant, verifySignedPreviewGrant } from "$lib/server/signedPreviewGrant";

export const ABOUT_PAGE_PREVIEW_COOKIE = "cms_about_page_preview";
export const ABOUT_PAGE_PREVIEW_PATH = "/preview/about-page";
export const ABOUT_PAGE_PREVIEW_SCOPE = "about-page-draft-preview";
export const ABOUT_PAGE_PREVIEW_TTL_SECONDS = 10 * 60;

export interface AboutPagePreviewGrant {
	scope: typeof ABOUT_PAGE_PREVIEW_SCOPE;
	siteUrl: string;
	draftRevisionId: string;
	iat: number;
	exp: number;
}

export async function createAboutPagePreviewGrant(
	secret: string,
	input: Pick<AboutPagePreviewGrant, "siteUrl" | "draftRevisionId">,
	now = Date.now(),
) {
	return await createSignedPreviewGrant(
		secret,
		{ scope: ABOUT_PAGE_PREVIEW_SCOPE, ...input },
		ABOUT_PAGE_PREVIEW_TTL_SECONDS,
		now,
	);
}

export async function verifyAboutPagePreviewGrant(
	secret: string,
	token: string | undefined,
	expectedSiteUrl: string,
	now = Date.now(),
): Promise<AboutPagePreviewGrant | null> {
	const payload = await verifySignedPreviewGrant(
		secret,
		token,
		{
			scope: ABOUT_PAGE_PREVIEW_SCOPE,
			siteUrl: expectedSiteUrl,
			ttlSeconds: ABOUT_PAGE_PREVIEW_TTL_SECONDS,
		},
		now,
	);
	if (!payload || typeof payload.draftRevisionId !== "string" || !payload.draftRevisionId) {
		return null;
	}
	return payload as unknown as AboutPagePreviewGrant;
}
