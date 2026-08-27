import { describe, expect, it } from "vitest";
import { defineSignedPreviewGrantFeature } from "$lib/server/signedPreviewGrant";

const SECRET = "preview-secret-that-is-at-least-thirty-two-characters";
const NOW = Date.UTC(2026, 6, 16, 12);
const TTL_SECONDS = 10 * 60;

interface TestPreviewGrant {
	scope: "test-draft-preview";
	siteUrl: string;
	draftRevisionId: string;
	iat: number;
	exp: number;
}

const [createTestPreviewGrant, verifyTestPreviewGrant] =
	defineSignedPreviewGrantFeature<TestPreviewGrant>({
		scope: "test-draft-preview",
		ttlSeconds: TTL_SECONDS,
		requiredStringFields: ["draftRevisionId"],
	});

describe("signed preview grant feature definition", () => {
	it("binds the scope, tenant, exact lifetime, and feature claims", async () => {
		const token = await createTestPreviewGrant(
			SECRET,
			{ siteUrl: "zippymiggy.com", draftRevisionId: "revision-1" },
			NOW,
		);
		await expect(verifyTestPreviewGrant(SECRET, token, "zippymiggy.com", NOW + 1)).resolves.toEqual(
			{
				scope: "test-draft-preview",
				siteUrl: "zippymiggy.com",
				draftRevisionId: "revision-1",
				iat: NOW,
				exp: NOW + TTL_SECONDS * 1000,
			},
		);
	});

	it("rejects tampering, another tenant, and expiry", async () => {
		const token = await createTestPreviewGrant(
			SECRET,
			{ siteUrl: "zippymiggy.com", draftRevisionId: "revision-1" },
			NOW,
		);
		await expect(
			verifyTestPreviewGrant(SECRET, `${token.slice(0, -1)}x`, "zippymiggy.com", NOW),
		).resolves.toBeNull();
		await expect(verifyTestPreviewGrant(SECRET, token, "other.example", NOW)).resolves.toBeNull();
		await expect(
			verifyTestPreviewGrant(SECRET, token, "zippymiggy.com", NOW + TTL_SECONDS * 1000),
		).resolves.toBeNull();
	});

	it("fails closed when the signing secret is too weak", async () => {
		await expect(
			createTestPreviewGrant(
				"short",
				{ siteUrl: "zippymiggy.com", draftRevisionId: "revision-1" },
				NOW,
			),
		).rejects.toThrow(/configured safely/);
	});
});
