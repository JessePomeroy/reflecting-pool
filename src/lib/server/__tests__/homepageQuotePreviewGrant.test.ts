import { describe, expect, it } from "vitest";
import {
	createHomepageQuotePreviewGrant,
	HOMEPAGE_QUOTE_PREVIEW_SCOPE,
	HOMEPAGE_QUOTE_PREVIEW_TTL_SECONDS,
	verifyHomepageQuotePreviewGrant,
} from "$lib/server/homepageQuotePreviewGrant";

const SECRET = "preview-secret-that-is-at-least-thirty-two-characters";
const NOW = Date.UTC(2026, 6, 16, 12);
const EXPECTED_TOKEN =
	"eyJzY29wZSI6ImhvbWVwYWdlLXF1b3RlLWRyYWZ0LXByZXZpZXciLCJzaXRlVXJsIjoiemlwcHltaWdneS5jb20iLCJkcmFmdFJldmlzaW9uSWQiOiJyZXZpc2lvbi0xIiwiaWF0IjoxNzg0MjAzMjAwMDAwLCJleHAiOjE3ODQyMDM4MDAwMDB9.HpQT9KXsgLPluYX1DbfdCtkIlA9grkskaIcc_6zK5sA";

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
		expect(token).toBe(EXPECTED_TOKEN);
		await expect(
			verifyHomepageQuotePreviewGrant(SECRET, token, "zippymiggy.com", NOW + 1),
		).resolves.toMatchObject({
			scope: HOMEPAGE_QUOTE_PREVIEW_SCOPE,
			draftRevisionId: "revision-1",
			exp: NOW + HOMEPAGE_QUOTE_PREVIEW_TTL_SECONDS * 1000,
		});
	});

	it("rejects an empty revision", async () => {
		const token = await createHomepageQuotePreviewGrant(
			SECRET,
			{
				siteUrl: "zippymiggy.com",
				draftRevisionId: "",
			},
			NOW,
		);
		await expect(
			verifyHomepageQuotePreviewGrant(SECRET, token, "zippymiggy.com", NOW),
		).resolves.toBeNull();
	});
});
