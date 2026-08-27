import { defineSignedPreviewGrantFeature } from "$lib/server/signedPreviewGrant";

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

export const [createPortfolioPreviewGrant, verifyPortfolioPreviewGrant] =
	defineSignedPreviewGrantFeature<PortfolioPreviewGrant>({
		scope: PORTFOLIO_PREVIEW_SCOPE,
		ttlSeconds: PORTFOLIO_PREVIEW_TTL_SECONDS,
		requiredStringFields: ["galleryId", "draftRevisionId"],
	});
