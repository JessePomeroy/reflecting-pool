import { describe, expect, it } from "vitest";
import {
	createHomepageQuotePreviewGrant,
	HOMEPAGE_QUOTE_PREVIEW_TTL_SECONDS,
	verifyHomepageQuotePreviewGrant,
} from "$lib/server/homepageQuotePreviewGrant";

const SECRET = "preview-secret-that-is-at-least-thirty-two-characters";
const NOW = Date.UTC(2026, 6, 16, 12);

describe("Homepage Quote draft preview grant", () => {
	it("binds the tenant, revision, and exact short lifetime", async () => {
		const token = await createHomepageQuotePreviewGrant(
			SECRET,
			{
				siteUrl: "zippymiggy.com",
				draftRevisionId: "revision-1",
			},
			NOW,
		);
		await expect(
			verifyHomepageQuotePreviewGrant(SECRET, token, "zippymiggy.com", NOW + 1),
		).resolves.toMatchObject({
			draftRevisionId: "revision-1",
			exp: NOW + HOMEPAGE_QUOTE_PREVIEW_TTL_SECONDS * 1000,
		});
	});

	it("rejects tampering, another tenant, and expiry", async () => {
		const token = await createHomepageQuotePreviewGrant(
			SECRET,
			{
				siteUrl: "zippymiggy.com",
				draftRevisionId: "revision-1",
			},
			NOW,
		);
		await expect(
			verifyHomepageQuotePreviewGrant(SECRET, `${token.slice(0, -1)}x`, "zippymiggy.com", NOW),
		).resolves.toBeNull();
		await expect(
			verifyHomepageQuotePreviewGrant(SECRET, token, "other.example", NOW),
		).resolves.toBeNull();
		await expect(
			verifyHomepageQuotePreviewGrant(
				SECRET,
				token,
				"zippymiggy.com",
				NOW + HOMEPAGE_QUOTE_PREVIEW_TTL_SECONDS * 1000,
			),
		).resolves.toBeNull();
	});
});
