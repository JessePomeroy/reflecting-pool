import { describe, expect, it } from "vitest";
import {
	ABOUT_PAGE_PREVIEW_SCOPE,
	ABOUT_PAGE_PREVIEW_TTL_SECONDS,
	createAboutPagePreviewGrant,
	verifyAboutPagePreviewGrant,
} from "$lib/server/aboutPagePreviewGrant";

const SECRET = "preview-secret-that-is-at-least-thirty-two-characters";
const NOW = Date.UTC(2026, 6, 16, 12);
const EXPECTED_TOKEN =
	"eyJzY29wZSI6ImFib3V0LXBhZ2UtZHJhZnQtcHJldmlldyIsInNpdGVVcmwiOiJ6aXBweW1pZ2d5LmNvbSIsImRyYWZ0UmV2aXNpb25JZCI6InJldmlzaW9uLTEiLCJpYXQiOjE3ODQyMDMyMDAwMDAsImV4cCI6MTc4NDIwMzgwMDAwMH0.FZQOdQkkYpKYEmCM0KDh80BO-xQc2h8bjuTYRNkAAoY";

describe("About page draft preview grant", () => {
	it("binds the tenant, revision, and exact short lifetime", async () => {
		const token = await createAboutPagePreviewGrant(
			SECRET,
			{ siteUrl: "zippymiggy.com", draftRevisionId: "revision-1" },
			NOW,
		);
		expect(token).toBe(EXPECTED_TOKEN);
		await expect(
			verifyAboutPagePreviewGrant(SECRET, token, "zippymiggy.com", NOW + 1),
		).resolves.toMatchObject({
			scope: ABOUT_PAGE_PREVIEW_SCOPE,
			draftRevisionId: "revision-1",
			exp: NOW + ABOUT_PAGE_PREVIEW_TTL_SECONDS * 1000,
		});
	});

	it("rejects an empty revision while preserving nonempty whitespace", async () => {
		const emptyRevisionToken = await createAboutPagePreviewGrant(
			SECRET,
			{ siteUrl: "zippymiggy.com", draftRevisionId: "" },
			NOW,
		);
		await expect(
			verifyAboutPagePreviewGrant(SECRET, emptyRevisionToken, "zippymiggy.com", NOW),
		).resolves.toBeNull();

		const whitespaceRevisionToken = await createAboutPagePreviewGrant(
			SECRET,
			{ siteUrl: "zippymiggy.com", draftRevisionId: " " },
			NOW,
		);
		await expect(
			verifyAboutPagePreviewGrant(SECRET, whitespaceRevisionToken, "zippymiggy.com", NOW),
		).resolves.toMatchObject({ draftRevisionId: " " });
	});
});
