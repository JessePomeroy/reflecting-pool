import { describe, expect, it } from "vitest";
import {
	createModelingPagePreviewGrant,
	MODELING_PAGE_PREVIEW_SCOPE,
	MODELING_PAGE_PREVIEW_TTL_SECONDS,
	verifyModelingPagePreviewGrant,
} from "$lib/server/modelingPagePreviewGrant";

const SECRET = "preview-secret-that-is-at-least-thirty-two-characters";
const NOW = Date.UTC(2026, 6, 16, 12);
const EXPECTED_TOKEN =
	"eyJzY29wZSI6Im1vZGVsaW5nLXBhZ2UtZHJhZnQtcHJldmlldyIsInNpdGVVcmwiOiJ6aXBweW1pZ2d5LmNvbSIsImRyYWZ0UmV2aXNpb25JZCI6InJldmlzaW9uLTEiLCJpYXQiOjE3ODQyMDMyMDAwMDAsImV4cCI6MTc4NDIwMzgwMDAwMH0.RjMC-wGcAV1DwGTx6sMIZmhUo2ZcIJS07iMfn3ZlBpo";

describe("Modeling page draft preview grant", () => {
	it("binds the tenant, revision, and exact short lifetime", async () => {
		const token = await createModelingPagePreviewGrant(
			SECRET,
			{ siteUrl: "zippymiggy.com", draftRevisionId: "revision-1" },
			NOW,
		);
		expect(token).toBe(EXPECTED_TOKEN);
		await expect(
			verifyModelingPagePreviewGrant(SECRET, token, "zippymiggy.com", NOW + 1),
		).resolves.toMatchObject({
			scope: MODELING_PAGE_PREVIEW_SCOPE,
			draftRevisionId: "revision-1",
			exp: NOW + MODELING_PAGE_PREVIEW_TTL_SECONDS * 1000,
		});
	});

	it("rejects an empty revision", async () => {
		const token = await createModelingPagePreviewGrant(
			SECRET,
			{ siteUrl: "zippymiggy.com", draftRevisionId: "" },
			NOW,
		);
		await expect(
			verifyModelingPagePreviewGrant(SECRET, token, "zippymiggy.com", NOW),
		).resolves.toBeNull();
	});
});
