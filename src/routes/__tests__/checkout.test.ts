import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock Stripe before importing the endpoint
const mockCreate = vi.fn().mockResolvedValue({
	id: "cs_test_session",
	url: "https://checkout.stripe.com/pay/cs_test_session",
});

function MockStripe() {
	return {
		checkout: { sessions: { create: mockCreate } },
		webhooks: { constructEvent: vi.fn() },
	};
}

vi.mock("stripe", () => ({ default: MockStripe }));

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

	it("passes correct metadata to Stripe session", async () => {
		mockCreate.mockClear();
		mockCreate.mockResolvedValue({
			id: "cs_test_meta",
			url: "https://checkout.stripe.com/pay/cs_test_meta",
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

		expect(mockCreate).toHaveBeenCalledWith(
			expect.objectContaining({
				metadata: expect.objectContaining({
					productSlug: "garden-portraits--img-08",
					paperName: "Glossy",
					paperSizeLabel: "4×6",
				}),
			}),
		);
	});
});
