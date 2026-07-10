import type Stripe from "stripe";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockConvexMutation = vi.fn();
const mockCreateLumaOrder = vi.fn();
const mockVerifyWebhook = vi.fn();

vi.mock("../../lib/server/convexClient", () => ({
	getConvex: () => ({ mutation: mockConvexMutation }),
}));

vi.mock("../../lib/server/lumaprints", () => ({
	createOrder: mockCreateLumaOrder,
}));

vi.mock("../../lib/server/stripe", () => ({
	verifyWebhook: mockVerifyWebhook,
	stripe: {},
}));

function makeStripeEvent(type: string): Stripe.Event {
	return {
		id: "evt_test_123",
		type,
		data: { object: {} },
	} as Stripe.Event;
}

function makeRequest(body: string, signature: string | null) {
	return {
		request: {
			text: () => Promise.resolve(body),
			headers: {
				get: (name: string) => (name === "stripe-signature" ? signature : null),
			},
		},
	};
}

describe("POST /api/webhooks/stripe", () => {
	let POST: (event: ReturnType<typeof makeRequest>) => Promise<Response>;

	beforeEach(async () => {
		vi.clearAllMocks();
		vi.resetModules();
		const mod = await import("../../routes/api/webhooks/stripe/+server");
		POST = mod.POST as unknown as typeof POST;
	});

	it("returns 400 when stripe-signature header is missing", async () => {
		const response = await POST(makeRequest("{}", null) as never);

		expect(response.status).toBe(400);
		expect(await response.json()).toEqual({ error: "Missing stripe-signature header" });
	});

	it("returns 400 when webhook signature is invalid", async () => {
		mockVerifyWebhook.mockRejectedValue(new Error("Signature mismatch"));

		const response = await POST(makeRequest("{}", "bad-sig") as never);

		expect(response.status).toBe(400);
		expect(await response.json()).toEqual({ error: "Invalid signature" });
	});

	it("rejects checkout events without order or fulfillment side effects", async () => {
		mockVerifyWebhook.mockResolvedValue(makeStripeEvent("checkout.session.completed"));

		const response = await POST(makeRequest("{}", "valid-sig") as never);

		expect(response.status).toBe(409);
		expect(await response.json()).toEqual({
			error: "Commerce webhook is owned by the Angels Rest hub",
		});
		expect(mockConvexMutation).not.toHaveBeenCalled();
		expect(mockCreateLumaOrder).not.toHaveBeenCalled();
	});

	it("acknowledges verified non-commerce events without side effects", async () => {
		mockVerifyWebhook.mockResolvedValue(makeStripeEvent("payment_intent.succeeded"));

		const response = await POST(makeRequest("{}", "valid-sig") as never);

		expect(response.status).toBe(200);
		expect(await response.json()).toEqual({ received: true });
		expect(mockConvexMutation).not.toHaveBeenCalled();
		expect(mockCreateLumaOrder).not.toHaveBeenCalled();
	});
});
