import { defineSignedPreviewGrantFeature } from "$lib/server/signedPreviewGrant";

export const CONTACT_PAGE_PREVIEW_COOKIE = "cms_contact_page_preview";
export const CONTACT_PAGE_PREVIEW_PATH = "/preview/about";
export const CONTACT_PAGE_PREVIEW_SCOPE = "contact-page-draft-preview";
export const CONTACT_PAGE_PREVIEW_TTL_SECONDS = 10 * 60;

export interface ContactPagePreviewGrant {
	scope: typeof CONTACT_PAGE_PREVIEW_SCOPE;
	siteUrl: string;
	draftRevisionId: string;
	iat: number;
	exp: number;
}

export const [createContactPagePreviewGrant, verifyContactPagePreviewGrant] =
	defineSignedPreviewGrantFeature<ContactPagePreviewGrant>({
		scope: CONTACT_PAGE_PREVIEW_SCOPE,
		ttlSeconds: CONTACT_PAGE_PREVIEW_TTL_SECONDS,
		requiredStringFields: ["draftRevisionId"],
	});
