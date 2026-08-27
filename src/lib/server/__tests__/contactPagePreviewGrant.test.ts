import { describe, expect, it } from "vitest";
import {
	CONTACT_PAGE_PREVIEW_SCOPE,
	CONTACT_PAGE_PREVIEW_TTL_SECONDS,
	createContactPagePreviewGrant,
	verifyContactPagePreviewGrant,
} from "$lib/server/contactPagePreviewGrant";

const SECRET = "preview-secret-that-is-at-least-thirty-two-characters";
const NOW = Date.UTC(2026, 6, 16, 12);
const EXPECTED_TOKEN =
	"eyJzY29wZSI6ImNvbnRhY3QtcGFnZS1kcmFmdC1wcmV2aWV3Iiwic2l0ZVVybCI6InppcHB5bWlnZ3kuY29tIiwiZHJhZnRSZXZpc2lvbklkIjoicmV2aXNpb24tMSIsImlhdCI6MTc4NDIwMzIwMDAwMCwiZXhwIjoxNzg0MjAzODAwMDAwfQ.MfVQ_SfX5AVFxyCZd36Ha4k58-mJ48xjw6QwoqtGbds";

describe("Contact page draft preview grant", () => {
	it("binds the tenant, revision, and exact short lifetime", async () => {
		const token = await createContactPagePreviewGrant(
			SECRET,
			{ siteUrl: "zippymiggy.com", draftRevisionId: "revision-1" },
			NOW,
		);
		expect(token).toBe(EXPECTED_TOKEN);
		await expect(
			verifyContactPagePreviewGrant(SECRET, token, "zippymiggy.com", NOW + 1),
		).resolves.toMatchObject({
			scope: CONTACT_PAGE_PREVIEW_SCOPE,
			draftRevisionId: "revision-1",
			exp: NOW + CONTACT_PAGE_PREVIEW_TTL_SECONDS * 1000,
		});
	});

	it("rejects an empty revision", async () => {
		const token = await createContactPagePreviewGrant(
			SECRET,
			{ siteUrl: "zippymiggy.com", draftRevisionId: "" },
			NOW,
		);
		await expect(
			verifyContactPagePreviewGrant(SECRET, token, "zippymiggy.com", NOW),
		).resolves.toBeNull();
	});
});
