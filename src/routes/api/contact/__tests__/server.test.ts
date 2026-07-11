import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
	verifyTurnstileToken: vi.fn(),
	resendSend: vi.fn(),
	rateLimit: vi.fn(),
}));

vi.mock("resend", () => ({
	Resend: class MockResend {
		emails = { send: mocks.resendSend };
	},
}));

vi.mock("$env/dynamic/private", () => ({
	env: { RESEND_API_KEY: "test-resend-key" },
}));

vi.mock("$env/static/public", () => ({
	PUBLIC_SITE_URL: "https://zippymiggy.com",
}));

vi.mock("$lib/server/rate-limit", () => ({
	rateLimit: mocks.rateLimit,
}));

vi.mock("$lib/server/turnstile", () => ({
	verifyTurnstileToken: mocks.verifyTurnstileToken,
}));

import { POST } from "../+server";

function postRequest(overrides: Record<string, unknown> = {}) {
	return {
		request: new Request("https://zippymiggy.com/api/contact", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				name: "Example Person",
				email: "person@example.com",
				subject: "Question",
				message: "Hello",
				"cf-turnstile-response": "challenge-token",
				...overrides,
			}),
		}),
		getClientAddress: () => "203.0.113.4",
	};
}

describe("contact API", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mocks.rateLimit.mockReturnValue({ allowed: true });
		mocks.verifyTurnstileToken.mockResolvedValue({ success: true });
		mocks.resendSend.mockResolvedValue({ id: "email-1" });
	});

	it("fails closed before email when Turnstile rejects the request", async () => {
		mocks.verifyTurnstileToken.mockResolvedValue({ success: false, reason: "rejected" });

		const response = await POST(postRequest() as never);

		expect(response.status).toBe(403);
		expect(mocks.resendSend).not.toHaveBeenCalled();
	});

	it("sends email only after server-side Turnstile verification", async () => {
		const response = await POST(postRequest() as never);

		expect(response.status).toBe(200);
		expect(mocks.verifyTurnstileToken).toHaveBeenCalledWith({
			token: "challenge-token",
			remoteIp: "203.0.113.4",
		});
		expect(mocks.resendSend).toHaveBeenCalledOnce();
	});

	it("preserves the existing per-IP rate limit ahead of verification", async () => {
		mocks.rateLimit.mockReturnValue({ allowed: false });

		const response = await POST(postRequest() as never);

		expect(response.status).toBe(429);
		expect(mocks.verifyTurnstileToken).not.toHaveBeenCalled();
		expect(mocks.resendSend).not.toHaveBeenCalled();
	});
});
