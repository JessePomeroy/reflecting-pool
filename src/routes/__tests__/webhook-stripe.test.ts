import type Stripe from "stripe";
import { beforeEach, describe, expect, it, vi } from "vitest";

// ─── Module Mocks ─────────────────────────────────────────────────────────────

const mockConvexMutation = vi.fn();
const mockCreateLumaOrder = vi.fn();
const mockBuildLumaOrder = vi.fn();
const mockVerifyWebhook = vi.fn();

// Intercept the ConvexHttpClient singleton. The webhook imports
// `getConvex()` which returns the client; we replace `mutation()` so
// every orders.create / orders.updateStatus call lands in our spy.
vi.mock("../../lib/server/convexClient", () => ({
	getConvex: () => ({
		mutation: mockConvexMutation,
	}),
}));

vi.mock("../../lib/server/lumaprints", () => ({
	createOrder: mockCreateLumaOrder,
	buildLumaPrintsOrder: mockBuildLumaOrder,
}));

vi.mock("../../lib/server/stripe", () => ({
	verifyWebhook: mockVerifyWebhook,
	stripe: {},
}));

vi.mock("$env/dynamic/private", () => ({
	env: {
		WEBHOOK_SECRET: "test-webhook-secret",
		RESEND_API_KEY: "",
		ADMIN_EMAIL: "admin@test.com",
		FROM_EMAIL: "orders@test.com",
	},
}));

// ─── Helpers ──────────────────────────────────────────────────────────────────

const VALID_METADATA = {
	imageUrl: "https://cdn.sanity.io/images/photo.jpg",
	imageTitle: "Spring Meadow",
	paperSubcategoryId: "103001",
	paperWidth: "8",
	paperHeight: "10",
	paperName: "Archival Matte",
	paperSizeLabel: "8×10",
	productSlug: "wildflowers--img-01",
};

function makeCheckoutSession(overrides?: Partial<Stripe.Checkout.Session>) {
	return {
		id: "cs_test_session_123",
		amount_total: 3500,
		amount_subtotal: 3500,
		customer_details: {
			name: "Jane Doe",
			email: "jane@example.com",
		},
		payment_intent: "pi_test_abc",
		metadata: VALID_METADATA,
		shipping_details: {
			name: "Jane Doe",
			address: {
				line1: "123 Main St",
				line2: null,
				city: "Detroit",
				state: "MI",
				postal_code: "48201",
				country: "US",
			},
		},
		...overrides,
	} as unknown as Stripe.Checkout.Session;
}

function makeStripeEvent(type: string, session: Stripe.Checkout.Session): Stripe.Event {
	return {
		id: "evt_test_123",
		type,
		data: { object: session },
	} as unknown as Stripe.Event;
}

function makeRequest(body: string, signature: string | null) {
	return {
		request: {
			text: () => Promise.resolve(body),
			json: () => Promise.resolve(JSON.parse(body)),
			headers: {
				get: (name: string) => (name === "stripe-signature" ? signature : null),
			},
		},
	};
}

/**
 * Default `orders.create` response used by most tests — new order, not a
 * retry, not yet submitted to LumaPrints.
 */
const FRESH_ORDER_RESULT = {
	_id: "j97xxxx" as unknown, // Convex Id<"orders"> — opaque
	orderNumber: "ORD-00042",
	alreadyExisted: false as const,
	lumaprintsOrderNumber: undefined,
	status: "new" as const,
	stripeFees: undefined,
};

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("POST /api/webhooks/stripe", () => {
	let POST: (event: ReturnType<typeof makeRequest>) => Promise<Response>;

	beforeEach(async () => {
		vi.clearAllMocks();
		vi.resetModules();

		// Top-level vi.mock() calls above are hoisted by Vitest and stay
		// active across resetModules() — they only need to be declared once.
		const mod = await import("../../routes/api/webhooks/stripe/+server");
		POST = mod.POST as unknown as typeof POST;
	});

	it("returns 400 when stripe-signature header is missing", async () => {
		const req = makeRequest("{}", null);
		const response = await POST(req as never);
		expect(response.status).toBe(400);
		const data = await response.json();
		expect(data.error).toMatch(/signature/i);
	});

	it("returns 400 when webhook signature is invalid", async () => {
		mockVerifyWebhook.mockRejectedValue(new Error("Signature mismatch"));
		const req = makeRequest("{}", "bad-sig");
		const response = await POST(req as never);
		expect(response.status).toBe(400);
		const data = await response.json();
		expect(data.error).toMatch(/signature/i);
	});

	it("creates a Convex order on valid checkout.session.completed", async () => {
		const session = makeCheckoutSession();
		const event = makeStripeEvent("checkout.session.completed", session);

		mockVerifyWebhook.mockResolvedValue(event);
		mockConvexMutation
			.mockResolvedValueOnce(FRESH_ORDER_RESULT) // orders.create
			.mockResolvedValueOnce(undefined); // orders.updateStatus (after LumaPrints)
		mockBuildLumaOrder.mockReturnValue({ externalId: "ORD-00042", orderItems: [] });
		mockCreateLumaOrder.mockResolvedValue({ orderNumber: "LP-99999", status: "pending" });

		const req = makeRequest(JSON.stringify({}), "valid-sig");
		const response = await POST(req as never);

		expect(response.status).toBe(200);
		// First mutation call is orders.create
		const [createRef, createArgs] = mockConvexMutation.mock.calls[0];
		expect(createRef).toBeDefined();
		expect(createArgs).toMatchObject({
			webhookSecret: "test-webhook-secret",
			siteUrl: "zippymiggy.com",
			stripeSessionId: session.id,
			customerEmail: "jane@example.com",
			fulfillmentType: "lumaprints",
			total: 35,
		});
	});

	it("submits to LumaPrints and patches order with lumaprintsOrderNumber", async () => {
		const session = makeCheckoutSession();
		const event = makeStripeEvent("checkout.session.completed", session);

		mockVerifyWebhook.mockResolvedValue(event);
		mockConvexMutation.mockResolvedValueOnce(FRESH_ORDER_RESULT).mockResolvedValueOnce(undefined);
		mockBuildLumaOrder.mockReturnValue({ externalId: "ORD-00042", orderItems: [] });
		mockCreateLumaOrder.mockResolvedValue({ orderNumber: "LP-77777", status: "pending" });

		const req = makeRequest("{}", "valid-sig");
		await POST(req as never);

		expect(mockCreateLumaOrder).toHaveBeenCalled();
		// Second mutation call is orders.updateStatus with the LumaPrints order #
		const [, updateArgs] = mockConvexMutation.mock.calls[1];
		expect(updateArgs).toMatchObject({
			orderId: FRESH_ORDER_RESULT._id,
			lumaprintsOrderNumber: "LP-77777",
			status: "printing",
		});
	});

	it("marks order as fulfillment_error when LumaPrints fails", async () => {
		const session = makeCheckoutSession();
		const event = makeStripeEvent("checkout.session.completed", session);

		mockVerifyWebhook.mockResolvedValue(event);
		mockConvexMutation
			.mockResolvedValueOnce(FRESH_ORDER_RESULT) // create
			.mockResolvedValueOnce(undefined); // updateStatus(fulfillment_error)
		mockBuildLumaOrder.mockReturnValue({ externalId: "ORD-00042", orderItems: [] });
		mockCreateLumaOrder.mockRejectedValue(new Error("LumaPrints API down"));

		const req = makeRequest("{}", "valid-sig");
		const response = await POST(req as never);

		// Still returns 200 — we don't want Stripe to retry
		expect(response.status).toBe(200);
		const [, updateArgs] = mockConvexMutation.mock.calls[1];
		expect(updateArgs).toMatchObject({
			orderId: FRESH_ORDER_RESULT._id,
			status: "fulfillment_error",
			fulfillmentError: "LumaPrints API down",
		});
	});

	it("skips LumaPrints submission on retry when order already has lumaprintsOrderNumber (C13)", async () => {
		const session = makeCheckoutSession();
		const event = makeStripeEvent("checkout.session.completed", session);

		mockVerifyWebhook.mockResolvedValue(event);
		// orders.create returns alreadyExisted=true with a LumaPrints number
		// already set — a prior webhook submitted. Must NOT re-submit.
		mockConvexMutation.mockResolvedValueOnce({
			...FRESH_ORDER_RESULT,
			alreadyExisted: true as const,
			lumaprintsOrderNumber: "LP-PRIOR-12345",
			status: "printing" as const,
		});

		const req = makeRequest("{}", "valid-sig");
		const response = await POST(req as never);

		expect(response.status).toBe(200);
		expect(mockCreateLumaOrder).not.toHaveBeenCalled();
		// No updateStatus call either (no new lumaprintsOrderNumber to record)
		expect(mockConvexMutation).toHaveBeenCalledTimes(1);
	});

	it("returns 200 with received:true for non-checkout events", async () => {
		const event = {
			id: "evt_other",
			type: "payment_intent.succeeded",
			data: { object: {} },
		} as Stripe.Event;
		mockVerifyWebhook.mockResolvedValue(event);

		const req = makeRequest("{}", "valid-sig");
		const response = await POST(req as never);
		expect(response.status).toBe(200);
		const data = await response.json();
		expect(data.received).toBe(true);
	});

	it("returns 400 when metadata or shipping is missing", async () => {
		const session = makeCheckoutSession({
			metadata: {} as never, // empty metadata
		});
		const event = makeStripeEvent("checkout.session.completed", session);

		mockVerifyWebhook.mockResolvedValue(event);

		const req = makeRequest("{}", "valid-sig");
		const response = await POST(req as never);
		expect(response.status).toBe(400);
	});
});
