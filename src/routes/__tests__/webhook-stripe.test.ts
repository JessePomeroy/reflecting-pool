import type Stripe from "stripe";
import { beforeEach, describe, expect, it, vi } from "vitest";

// ─── Module Mocks ─────────────────────────────────────────────────────────────

const mockCreateSanityOrder = vi.fn();
const mockUpdateSanityOrder = vi.fn();
const mockCreateLumaOrder = vi.fn();
const mockBuildLumaOrder = vi.fn();
const mockVerifyWebhook = vi.fn();

vi.mock("../../lib/server/sanity", () => ({
	createSanityOrder: mockCreateSanityOrder,
	updateSanityOrder: mockUpdateSanityOrder,
}));

vi.mock("../../lib/server/lumaprints", () => ({
	createOrder: mockCreateLumaOrder,
	buildLumaPrintsOrder: mockBuildLumaOrder,
}));

vi.mock("../../lib/server/stripe", () => ({
	verifyWebhook: mockVerifyWebhook,
	stripe: {},
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
		customer_details: {
			name: "Jane Doe",
			email: "jane@example.com",
		},
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

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("POST /api/webhooks/stripe", () => {
	let POST: (event: ReturnType<typeof makeRequest>) => Promise<Response>;

	beforeEach(async () => {
		vi.clearAllMocks();
		vi.resetModules();

		// Re-apply mocks after resetModules
		vi.mock("../../lib/server/sanity", () => ({
			createSanityOrder: mockCreateSanityOrder,
			updateSanityOrder: mockUpdateSanityOrder,
		}));
		vi.mock("../../lib/server/lumaprints", () => ({
			createOrder: mockCreateLumaOrder,
			buildLumaPrintsOrder: mockBuildLumaOrder,
		}));
		vi.mock("../../lib/server/stripe", () => ({
			verifyWebhook: mockVerifyWebhook,
			stripe: {},
		}));

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

	it("creates a Sanity order on valid checkout.session.completed", async () => {
		const session = makeCheckoutSession();
		const event = makeStripeEvent("checkout.session.completed", session);

		mockVerifyWebhook.mockResolvedValue(event);
		mockCreateSanityOrder.mockResolvedValue({
			_id: "sanity-order-abc",
			stripeSessionId: session.id,
			customerName: "Jane Doe",
			customerEmail: "jane@example.com",
			status: "processing",
			paperName: "Archival Matte",
			paperSize: "8×10",
			amount: 35,
			createdAt: new Date().toISOString(),
		});
		mockBuildLumaOrder.mockReturnValue({ externalId: "sanity-order-abc", orderItems: [] });
		mockCreateLumaOrder.mockResolvedValue({ orderNumber: "LP-99999", status: "pending" });
		mockUpdateSanityOrder.mockResolvedValue(undefined);

		const req = makeRequest(JSON.stringify({}), "valid-sig");
		const response = await POST(req as never);

		expect(response.status).toBe(200);
		expect(mockCreateSanityOrder).toHaveBeenCalledWith(
			expect.objectContaining({
				stripeSessionId: session.id,
				customerName: "Jane Doe",
				customerEmail: "jane@example.com",
			}),
		);
	});

	it("submits to LumaPrints after creating Sanity order", async () => {
		const session = makeCheckoutSession();
		const event = makeStripeEvent("checkout.session.completed", session);

		mockVerifyWebhook.mockResolvedValue(event);
		mockCreateSanityOrder.mockResolvedValue({
			_id: "sanity-order-lp",
			stripeSessionId: session.id,
			customerName: "Jane Doe",
			customerEmail: "jane@example.com",
			status: "processing",
			paperName: "Archival Matte",
			paperSize: "8×10",
			amount: 35,
			createdAt: new Date().toISOString(),
		});
		mockBuildLumaOrder.mockReturnValue({ externalId: "sanity-order-lp", orderItems: [] });
		mockCreateLumaOrder.mockResolvedValue({ orderNumber: "LP-77777", status: "pending" });
		mockUpdateSanityOrder.mockResolvedValue(undefined);

		const req = makeRequest("{}", "valid-sig");
		await POST(req as never);

		expect(mockCreateLumaOrder).toHaveBeenCalled();
		expect(mockUpdateSanityOrder).toHaveBeenCalledWith(
			"sanity-order-lp",
			expect.objectContaining({ lumaprintsOrderNumber: "LP-77777", status: "submitted" }),
		);
	});

	it("marks order as fulfillment_error when LumaPrints fails", async () => {
		const session = makeCheckoutSession();
		const event = makeStripeEvent("checkout.session.completed", session);

		mockVerifyWebhook.mockResolvedValue(event);
		mockCreateSanityOrder.mockResolvedValue({
			_id: "sanity-order-err",
			stripeSessionId: session.id,
			customerName: "Jane Doe",
			customerEmail: "jane@example.com",
			status: "processing",
			paperName: "Archival Matte",
			paperSize: "8×10",
			amount: 35,
			createdAt: new Date().toISOString(),
		});
		mockBuildLumaOrder.mockReturnValue({ externalId: "sanity-order-err", orderItems: [] });
		mockCreateLumaOrder.mockRejectedValue(new Error("LumaPrints API down"));
		mockUpdateSanityOrder.mockResolvedValue(undefined);

		const req = makeRequest("{}", "valid-sig");
		const response = await POST(req as never);

		// Should still return 200 — we don't want Stripe to retry
		expect(response.status).toBe(200);
		expect(mockUpdateSanityOrder).toHaveBeenCalledWith(
			"sanity-order-err",
			expect.objectContaining({
				status: "fulfillment_error",
				fulfillmentError: "LumaPrints API down",
			}),
		);
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
