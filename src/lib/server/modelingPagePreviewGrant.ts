import { defineSignedPreviewGrantFeature } from "$lib/server/signedPreviewGrant";

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

export const [createModelingPagePreviewGrant, verifyModelingPagePreviewGrant] =
	defineSignedPreviewGrantFeature<ModelingPagePreviewGrant>({
		scope: MODELING_PAGE_PREVIEW_SCOPE,
		ttlSeconds: MODELING_PAGE_PREVIEW_TTL_SECONDS,
		requiredStringFields: ["draftRevisionId"],
	});
