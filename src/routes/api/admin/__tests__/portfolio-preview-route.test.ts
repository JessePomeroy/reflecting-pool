import { beforeEach, describe, expect, it, vi } from "vitest";
import { verifyPortfolioPreviewGrant } from "$lib/server/portfolioPreviewGrant";

const SECRET = "preview-secret-that-is-at-least-thirty-two-characters";
const { query, verifyAdmin, getAuthenticatedConvex } = vi.hoisted(() => ({
	query: vi.fn(),
	verifyAdmin: vi.fn(),
	getAuthenticatedConvex: vi.fn(),
}));

vi.mock("@jessepomeroy/admin/server", () => ({ getAuthenticatedConvex }));
vi.mock("$lib/server/adminHandler", () => ({}));
vi.mock("$lib/server/siteAdminAuthorization", () => ({
	verifySiteAdminRequest: verifyAdmin,
}));
vi.mock("$env/dynamic/private", () => ({
	env: { CMS_PREVIEW_SECRET: "preview-secret-that-is-at-least-thirty-two-characters" },
}));
vi.mock("$convex/api", () => ({
	api: { portfolioGalleries: { getEditorState: "portfolioGalleries.getEditorState" } },
}));

import { POST } from "../preview/portfolio/+server";

function request(draftRevisionId = "revision-1") {
	return new Request("https://zippymiggy.com/api/admin/preview/portfolio", {
		method: "POST",
		headers: { "Content-Type": "application/json", cookie: "session=valid" },
		body: JSON.stringify({ galleryId: "gallery-1", draftRevisionId }),
	});
}

function event(input = request()) {
	return {
		request: input,
		url: new URL(input.url),
		cookies: { set: vi.fn() },
	};
}

describe("POST /api/admin/preview/portfolio", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		verifyAdmin.mockResolvedValue(true);
		getAuthenticatedConvex.mockResolvedValue({ query });
		query.mockResolvedValue({
			galleryId: "gallery-1",
			draft: { revisionId: "revision-1" },
		});
	});

	it("issues an HttpOnly host-scoped grant for the exact current draft", async () => {
		const input = event();
		const response = await POST(input as never);

		expect(response.status).toBe(200);
		expect(query).toHaveBeenCalledWith("portfolioGalleries.getEditorState", {
			galleryId: "gallery-1",
		});
		const [name, token, options] = input.cookies.set.mock.calls[0];
		expect(name).toBe("cms_portfolio_preview");
		expect(options).toMatchObject({
			path: "/gallery/preview",
			httpOnly: true,
			secure: true,
			sameSite: "lax",
			maxAge: 600,
		});
		await expect(
			verifyPortfolioPreviewGrant(SECRET, token, "zippymiggy.com"),
		).resolves.toMatchObject({
			galleryId: "gallery-1",
			draftRevisionId: "revision-1",
		});
		await expect(response.json()).resolves.toEqual({ previewUrl: "/gallery/preview" });
	});

	it("rejects stale revisions without setting a grant", async () => {
		const input = event(request("older-revision"));
		const response = await POST(input as never);

		expect(response.status).toBe(409);
		expect(input.cookies.set).not.toHaveBeenCalled();
	});

	it("rejects a request without stored site membership before reading the draft", async () => {
		verifyAdmin.mockResolvedValue(false);
		const input = event();
		const response = await POST(input as never);

		expect(response.status).toBe(401);
		expect(query).not.toHaveBeenCalled();
		expect(input.cookies.set).not.toHaveBeenCalled();
	});
});
