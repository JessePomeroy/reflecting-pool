import { describe, expect, it } from "vitest";
import {
	ABOUT_PAGE_PREVIEW_TTL_SECONDS,
	createAboutPagePreviewGrant,
	verifyAboutPagePreviewGrant,
} from "$lib/server/aboutPagePreviewGrant";

const SECRET = "preview-secret-that-is-at-least-thirty-two-characters";
const NOW = Date.UTC(2026, 6, 16, 12);

describe("About page draft preview grant", () => {
	it("binds the tenant, revision, and exact short lifetime", async () => {
		const token = await createAboutPagePreviewGrant(
			SECRET,
			{ siteUrl: "zippymiggy.com", draftRevisionId: "revision-1" },
			NOW,
		);
		await expect(
			verifyAboutPagePreviewGrant(SECRET, token, "zippymiggy.com", NOW + 1),
		).resolves.toMatchObject({
			draftRevisionId: "revision-1",
			exp: NOW + ABOUT_PAGE_PREVIEW_TTL_SECONDS * 1000,
		});
	});

	it("rejects tampering, another tenant, and expiry", async () => {
		const token = await createAboutPagePreviewGrant(
			SECRET,
			{ siteUrl: "zippymiggy.com", draftRevisionId: "revision-1" },
			NOW,
		);
		await expect(
			verifyAboutPagePreviewGrant(SECRET, `${token.slice(0, -1)}x`, "zippymiggy.com", NOW),
		).resolves.toBeNull();
		await expect(
			verifyAboutPagePreviewGrant(SECRET, token, "other.example", NOW),
		).resolves.toBeNull();
		await expect(
			verifyAboutPagePreviewGrant(
				SECRET,
				token,
				"zippymiggy.com",
				NOW + ABOUT_PAGE_PREVIEW_TTL_SECONDS * 1000,
			),
		).resolves.toBeNull();
	});
});
