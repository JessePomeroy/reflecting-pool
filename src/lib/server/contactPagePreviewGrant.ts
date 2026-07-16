import { createSignedPreviewGrant, verifySignedPreviewGrant } from "$lib/server/signedPreviewGrant";

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

export async function createContactPagePreviewGrant(
	secret: string,
	input: Pick<ContactPagePreviewGrant, "siteUrl" | "draftRevisionId">,
	now = Date.now(),
) {
	return await createSignedPreviewGrant(
		secret,
		{
			scope: CONTACT_PAGE_PREVIEW_SCOPE,
			...input,
		},
		CONTACT_PAGE_PREVIEW_TTL_SECONDS,
		now,
	);
}

export async function verifyContactPagePreviewGrant(
	secret: string,
	token: string | undefined,
	expectedSiteUrl: string,
	now = Date.now(),
): Promise<ContactPagePreviewGrant | null> {
	const payload = await verifySignedPreviewGrant(
		secret,
		token,
		{
			scope: CONTACT_PAGE_PREVIEW_SCOPE,
			siteUrl: expectedSiteUrl,
			ttlSeconds: CONTACT_PAGE_PREVIEW_TTL_SECONDS,
		},
		now,
	);
	if (!payload || typeof payload.draftRevisionId !== "string" || !payload.draftRevisionId) {
		return null;
	}
	return payload as unknown as ContactPagePreviewGrant;
}
