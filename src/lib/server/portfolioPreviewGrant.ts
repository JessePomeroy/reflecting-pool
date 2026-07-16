import { createSignedPreviewGrant, verifySignedPreviewGrant } from "$lib/server/signedPreviewGrant";

export const PORTFOLIO_PREVIEW_COOKIE = "cms_portfolio_preview";
export const PORTFOLIO_PREVIEW_PATH = "/gallery/preview";
export const PORTFOLIO_PREVIEW_SCOPE = "portfolio-draft-preview";
export const PORTFOLIO_PREVIEW_TTL_SECONDS = 10 * 60;

export interface PortfolioPreviewGrant {
	scope: typeof PORTFOLIO_PREVIEW_SCOPE;
	siteUrl: string;
	galleryId: string;
	draftRevisionId: string;
	iat: number;
	exp: number;
}

export async function createPortfolioPreviewGrant(
	secret: string,
	input: Pick<PortfolioPreviewGrant, "siteUrl" | "galleryId" | "draftRevisionId">,
	now = Date.now(),
) {
	return await createSignedPreviewGrant(
		secret,
		{
			scope: PORTFOLIO_PREVIEW_SCOPE,
			...input,
		},
		PORTFOLIO_PREVIEW_TTL_SECONDS,
		now,
	);
}

export async function verifyPortfolioPreviewGrant(
	secret: string,
	token: string | undefined,
	expectedSiteUrl: string,
	now = Date.now(),
): Promise<PortfolioPreviewGrant | null> {
	const payload = await verifySignedPreviewGrant(
		secret,
		token,
		{
			scope: PORTFOLIO_PREVIEW_SCOPE,
			siteUrl: expectedSiteUrl,
			ttlSeconds: PORTFOLIO_PREVIEW_TTL_SECONDS,
		},
		now,
	);
	if (!payload) return null;
	if (
		typeof payload.galleryId !== "string" ||
		!payload.galleryId ||
		typeof payload.draftRevisionId !== "string" ||
		!payload.draftRevisionId
	)
		return null;
	return payload as unknown as PortfolioPreviewGrant;
}
