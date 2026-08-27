import { defineSignedPreviewGrantFeature } from "$lib/server/signedPreviewGrant";

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

export const [createAboutPagePreviewGrant, verifyAboutPagePreviewGrant] =
	defineSignedPreviewGrantFeature<AboutPagePreviewGrant>({
		scope: ABOUT_PAGE_PREVIEW_SCOPE,
		ttlSeconds: ABOUT_PAGE_PREVIEW_TTL_SECONDS,
		requiredStringFields: ["draftRevisionId"],
	});
