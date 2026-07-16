import { describe, expect, it } from "vitest";
import {
	createPortfolioPreviewGrant,
	PORTFOLIO_PREVIEW_TTL_SECONDS,
	verifyPortfolioPreviewGrant,
} from "$lib/server/portfolioPreviewGrant";

const SECRET = "preview-secret-that-is-at-least-thirty-two-characters";
const NOW = Date.UTC(2026, 6, 16, 12);

describe("portfolio draft preview grant", () => {
	it("binds the tenant, gallery, revision, and exact short lifetime", async () => {
		const token = await createPortfolioPreviewGrant(
			SECRET,
			{
				siteUrl: "zippymiggy.com",
				galleryId: "gallery-1",
				draftRevisionId: "revision-1",
			},
			NOW,
		);
		await expect(
			verifyPortfolioPreviewGrant(SECRET, token, "zippymiggy.com", NOW + 1),
		).resolves.toMatchObject({
			galleryId: "gallery-1",
			draftRevisionId: "revision-1",
			exp: NOW + PORTFOLIO_PREVIEW_TTL_SECONDS * 1000,
		});
	});

	it("rejects tampering, another tenant, and expiry", async () => {
		const token = await createPortfolioPreviewGrant(
			SECRET,
			{
				siteUrl: "zippymiggy.com",
				galleryId: "gallery-1",
				draftRevisionId: "revision-1",
			},
			NOW,
		);
		await expect(
			verifyPortfolioPreviewGrant(SECRET, `${token.slice(0, -1)}x`, "zippymiggy.com", NOW),
		).resolves.toBeNull();
		await expect(
			verifyPortfolioPreviewGrant(SECRET, token, "other.example", NOW),
		).resolves.toBeNull();
		await expect(
			verifyPortfolioPreviewGrant(
				SECRET,
				token,
				"zippymiggy.com",
				NOW + PORTFOLIO_PREVIEW_TTL_SECONDS * 1000,
			),
		).resolves.toBeNull();
	});

	it("fails closed when the signing secret is too weak", async () => {
		await expect(
			createPortfolioPreviewGrant(
				"short",
				{
					siteUrl: "zippymiggy.com",
					galleryId: "gallery-1",
					draftRevisionId: "revision-1",
				},
				NOW,
			),
		).rejects.toThrow(/configured safely/);
	});
});
