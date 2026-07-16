import { beforeEach, describe, expect, it, vi } from "vitest";
import { verifyContactPagePreviewGrant } from "$lib/server/contactPagePreviewGrant";

const SECRET = "preview-secret-that-is-at-least-thirty-two-characters";
const { query, verifyAdmin, getAuthenticatedConvex } = vi.hoisted(() => ({
	query: vi.fn(),
	verifyAdmin: vi.fn(),
	getAuthenticatedConvex: vi.fn(),
}));

vi.mock("@jessepomeroy/admin/server", () => ({ getAuthenticatedConvex }));
vi.mock("$lib/server/adminHandler", () => ({}));
vi.mock("$lib/config/admin", () => ({ adminConfig: { siteUrl: "zippymiggy.com" } }));
vi.mock("$lib/server/siteAdminAuthorization", () => ({ verifySiteAdminRequest: verifyAdmin }));
vi.mock("$env/dynamic/private", () => ({
	env: { CMS_PREVIEW_SECRET: "preview-secret-that-is-at-least-thirty-two-characters" },
}));
vi.mock("$convex/api", () => ({
	api: { content: { getContactPageEditorState: "content.getContactPageEditorState" } },
}));

import { POST } from "../preview/contact/+server";

function request(draftRevisionId = "revision-1") {
	return new Request("https://zippymiggy.com/api/admin/preview/contact", {
		method: "POST",
		headers: { "Content-Type": "application/json", cookie: "session=valid" },
		body: JSON.stringify({ draftRevisionId }),
	});
}

function event(input = request()) {
	return { request: input, url: new URL(input.url), cookies: { set: vi.fn() } };
}

describe("POST /api/admin/preview/contact", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		verifyAdmin.mockResolvedValue(true);
		getAuthenticatedConvex.mockResolvedValue({ query });
		query.mockResolvedValue({
			draft: { revisionId: "revision-1", payload: { heading: "Draft" } },
		});
	});

	it("issues an HttpOnly path-scoped grant for the exact current draft", async () => {
		const input = event();
		const response = await POST(input as never);
		expect(response.status).toBe(200);
		expect(query).toHaveBeenCalledWith("content.getContactPageEditorState", {
			siteUrl: "zippymiggy.com",
		});
		const [name, token, options] = input.cookies.set.mock.calls[0];
		expect(name).toBe("cms_contact_page_preview");
		expect(options).toMatchObject({
			path: "/preview/about",
			httpOnly: true,
			secure: true,
			sameSite: "lax",
			maxAge: 600,
		});
		await expect(
			verifyContactPagePreviewGrant(SECRET, token, "zippymiggy.com"),
		).resolves.toMatchObject({ draftRevisionId: "revision-1" });
		await expect(response.json()).resolves.toEqual({ previewUrl: "/preview/about" });
	});

	it("rejects stale revisions without setting a grant", async () => {
		const input = event(request("older-revision"));
		const response = await POST(input as never);
		expect(response.status).toBe(409);
		expect(input.cookies.set).not.toHaveBeenCalled();
	});

	it("rejects missing site membership before reading the draft", async () => {
		verifyAdmin.mockResolvedValue(false);
		const input = event();
		const response = await POST(input as never);
		expect(response.status).toBe(401);
		expect(query).not.toHaveBeenCalled();
	});
});
