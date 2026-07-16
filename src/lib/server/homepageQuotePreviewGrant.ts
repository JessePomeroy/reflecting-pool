import { createSignedPreviewGrant, verifySignedPreviewGrant } from "$lib/server/signedPreviewGrant";

export const HOMEPAGE_QUOTE_PREVIEW_COOKIE = "cms_homepage_quote_preview";
export const HOMEPAGE_QUOTE_PREVIEW_PATH = "/preview/homepage";
export const HOMEPAGE_QUOTE_PREVIEW_SCOPE = "homepage-quote-draft-preview";
export const HOMEPAGE_QUOTE_PREVIEW_TTL_SECONDS = 10 * 60;

export interface HomepageQuotePreviewGrant {
	scope: typeof HOMEPAGE_QUOTE_PREVIEW_SCOPE;
	siteUrl: string;
	draftRevisionId: string;
	iat: number;
	exp: number;
}

export async function createHomepageQuotePreviewGrant(
	secret: string,
	input: Pick<HomepageQuotePreviewGrant, "siteUrl" | "draftRevisionId">,
	now = Date.now(),
) {
	return await createSignedPreviewGrant(
		secret,
		{
			scope: HOMEPAGE_QUOTE_PREVIEW_SCOPE,
			...input,
		},
		HOMEPAGE_QUOTE_PREVIEW_TTL_SECONDS,
		now,
	);
}

export async function verifyHomepageQuotePreviewGrant(
	secret: string,
	token: string | undefined,
	expectedSiteUrl: string,
	now = Date.now(),
): Promise<HomepageQuotePreviewGrant | null> {
	const payload = await verifySignedPreviewGrant(
		secret,
		token,
		{
			scope: HOMEPAGE_QUOTE_PREVIEW_SCOPE,
			siteUrl: expectedSiteUrl,
			ttlSeconds: HOMEPAGE_QUOTE_PREVIEW_TTL_SECONDS,
		},
		now,
	);
	if (!payload || typeof payload.draftRevisionId !== "string" || !payload.draftRevisionId) {
		return null;
	}
	return payload as unknown as HomepageQuotePreviewGrant;
}
