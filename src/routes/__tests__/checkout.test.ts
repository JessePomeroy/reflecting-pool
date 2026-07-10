import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockCreateHubPrintCheckoutSession } = vi.hoisted(() => ({
	mockCreateHubPrintCheckoutSession: vi.fn().mockResolvedValue({
		sessionId: "cs_test_session",
		url: "https://checkout.stripe.com/pay/cs_test_session",
		platformFeeAmount: 175,
	}),
}));

vi.mock("$lib/server/checkoutBridge", () => ({
	createHubPrintCheckoutSession: mockCreateHubPrintCheckoutSession,
}));

const checkoutUrl = "https://checkout.stripe.com/pay/cs_test_session";

// Helper to create a mock SvelteKit RequestEvent
function makeRequest(body: unknown) {
	return {
		request: {
			json: () => Promise.resolve(body),
			text: () => Promise.resolve(JSON.stringify(body)),
			headers: { get: () => null },
		},
		params: {},
		url: new URL("http://localhost/api/checkout"),
		route: { id: "/api/checkout" },
		fetch: vi.fn(),
		getClientAddress: () => "127.0.0.1",
		locals: {},
		platform: undefined,
		setHeaders: vi.fn(),
		isDataRequest: false,
		isSubRequest: false,
		cookies: { get: vi.fn(), set: vi.fn(), delete: vi.fn(), serialize: vi.fn(), getAll: vi.fn() },
	};
}

describe("POST /api/checkout", () => {
	let POST: (event: ReturnType<typeof makeRequest>) => Promise<Response>;

	beforeEach(async () => {
		vi.clearAllMocks();
		mockCreateHubPrintCheckoutSession.mockResolvedValue({
			sessionId: "cs_test_session",
			url: checkoutUrl,
			platformFeeAmount: 175,
		});
		// Dynamic import after mocks are set up
		const mod = await import("../../routes/api/checkout/+server");
		POST = mod.POST as unknown as typeof POST;
	});

	it("returns 400 when productSlug is missing", async () => {
		const req = makeRequest({
			imageUrl: "https://cdn.sanity.io/images/a.jpg",
			paperName: "Archival Matte",
			paperWidth: 8,
			paperHeight: 10,
			paperSizeLabel: "8×10",
			priceInDollars: 35,
		});

		let thrown: Error | undefined;
		try {
			await POST(req as never);
		} catch (e) {
			thrown = e as Error;
		}
		// SvelteKit error() throws an HttpError
		expect(thrown).toBeDefined();
		expect((thrown as { status?: number }).status).toBe(400);
	});

	it("returns 400 when imageUrl is missing", async () => {
		const req = makeRequest({
			productSlug: "wildflowers--img-01",
			paperName: "Archival Matte",
			paperWidth: 8,
			paperHeight: 10,
			paperSizeLabel: "8×10",
			priceInDollars: 35,
		});

		let thrown: Error | undefined;
		try {
			await POST(req as never);
		} catch (e) {
			thrown = e as Error;
		}
		expect((thrown as { status?: number }).status).toBe(400);
	});

	it("returns 400 when price does not match pricing table", async () => {
		const req = makeRequest({
			productSlug: "wildflowers--img-01",
			imageUrl: "https://cdn.sanity.io/images/a.jpg",
			imageTitle: "Spring Meadow",
			paperName: "Archival Matte",
			paperSubcategoryId: 103001,
			paperWidth: 8,
			paperHeight: 10,
			paperSizeLabel: "8×10",
			priceInDollars: 9999, // tampered price
		});

		let thrown: Error | undefined;
		try {
			await POST(req as never);
		} catch (e) {
			thrown = e as Error;
		}
		expect((thrown as { status?: number }).status).toBe(400);
	});

	it("returns JSON with checkout URL on valid request", async () => {
		const req = makeRequest({
			productSlug: "wildflowers--img-01",
			imageUrl: "https://cdn.sanity.io/images/a.jpg",
			imageTitle: "Spring Meadow",
			paperName: "Archival Matte",
			paperSubcategoryId: 103001,
			paperWidth: 8,
			paperHeight: 10,
			paperSizeLabel: "8×10",
			priceInDollars: 35, // matches pricing table
		});

		const response = await POST(req as never);
		expect(response.status).toBe(200);
		const data = await response.json();
		expect(data).toHaveProperty("url");
		expect(data.url).toContain("checkout.stripe.com");
	});

	it("passes validated print metadata to the hub checkout bridge", async () => {
		mockCreateHubPrintCheckoutSession.mockResolvedValue({
			sessionId: "cs_test_meta",
			url: "https://checkout.stripe.com/pay/cs_test_meta",
			platformFeeAmount: 90,
		});

		const req = makeRequest({
			productSlug: "garden-portraits--img-08",
			imageUrl: "https://cdn.sanity.io/images/peony.jpg",
			imageTitle: "Peony Blush",
			paperName: "Glossy",
			paperSubcategoryId: 103007,
			paperWidth: 4,
			paperHeight: 6,
			paperSizeLabel: "4×6",
			priceInDollars: 18,
		});

		await POST(req as never);

		expect(mockCreateHubPrintCheckoutSession).toHaveBeenCalledWith(
			expect.objectContaining({
				siteUrl: "zippymiggy.com",
				amountCents: 1800,
				productName: "Peony Blush — 4×6",
				metadata: expect.objectContaining({
					productSlug: "garden-portraits--img-08",
					paperName: "Glossy",
					paperSizeLabel: "4×6",
				}),
			}),
		);
	});
});
