import { defineSignedPreviewGrantFeature } from "$lib/server/signedPreviewGrant";

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

export const [createHomepageQuotePreviewGrant, verifyHomepageQuotePreviewGrant] =
	defineSignedPreviewGrantFeature<HomepageQuotePreviewGrant>({
		scope: HOMEPAGE_QUOTE_PREVIEW_SCOPE,
		ttlSeconds: HOMEPAGE_QUOTE_PREVIEW_TTL_SECONDS,
		requiredStringFields: ["draftRevisionId"],
	});
