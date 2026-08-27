import { describe, expect, it } from "vitest";
import {
	createPortfolioPreviewGrant,
	PORTFOLIO_PREVIEW_SCOPE,
	PORTFOLIO_PREVIEW_TTL_SECONDS,
	verifyPortfolioPreviewGrant,
} from "$lib/server/portfolioPreviewGrant";

const SECRET = "preview-secret-that-is-at-least-thirty-two-characters";
const NOW = Date.UTC(2026, 6, 16, 12);
const EXPECTED_TOKEN =
	"eyJzY29wZSI6InBvcnRmb2xpby1kcmFmdC1wcmV2aWV3Iiwic2l0ZVVybCI6InppcHB5bWlnZ3kuY29tIiwiZ2FsbGVyeUlkIjoiZ2FsbGVyeS0xIiwiZHJhZnRSZXZpc2lvbklkIjoicmV2aXNpb24tMSIsImlhdCI6MTc4NDIwMzIwMDAwMCwiZXhwIjoxNzg0MjAzODAwMDAwfQ.3pH12OrU0DocnfZQeia1uSOwTU1HqtNFJmGYX2YO7Lw";

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
		expect(token).toBe(EXPECTED_TOKEN);
		await expect(
			verifyPortfolioPreviewGrant(SECRET, token, "zippymiggy.com", NOW + 1),
		).resolves.toMatchObject({
			scope: PORTFOLIO_PREVIEW_SCOPE,
			galleryId: "gallery-1",
			draftRevisionId: "revision-1",
			exp: NOW + PORTFOLIO_PREVIEW_TTL_SECONDS * 1000,
		});
	});

	it("rejects an empty gallery or revision", async () => {
		const emptyGalleryToken = await createPortfolioPreviewGrant(
			SECRET,
			{
				siteUrl: "zippymiggy.com",
				galleryId: "",
				draftRevisionId: "revision-1",
			},
			NOW,
		);
		await expect(
			verifyPortfolioPreviewGrant(SECRET, emptyGalleryToken, "zippymiggy.com", NOW),
		).resolves.toBeNull();

		const emptyRevisionToken = await createPortfolioPreviewGrant(
			SECRET,
			{
				siteUrl: "zippymiggy.com",
				galleryId: "gallery-1",
				draftRevisionId: "",
			},
			NOW,
		);
		await expect(
			verifyPortfolioPreviewGrant(SECRET, emptyRevisionToken, "zippymiggy.com", NOW),
		).resolves.toBeNull();
	});
});
