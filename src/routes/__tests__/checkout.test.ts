import { beforeEach, describe, expect, it, vi } from "vitest";
import { env } from "$env/dynamic/private";
import { checkoutSnapshotMode, validateCheckoutAttempt } from "$lib/server/checkoutIntake";

const { mockCreateHubPrintCheckoutSession, mockResolveCatalog } = vi.hoisted(() => ({
	mockResolveCatalog: vi.fn(),
	mockCreateHubPrintCheckoutSession: vi.fn().mockResolvedValue({
		sessionId: "cs_test_session",
		url: "https://checkout.stripe.com/pay/cs_test_session",
		platformFeeAmount: 175,
	}),
}));

vi.mock("$lib/server/checkoutBridge", () => ({
	createHubPrintCheckoutSession: mockCreateHubPrintCheckoutSession,
}));
vi.mock("$lib/server/checkoutCatalogResolver", () => ({
	resolveAuthoritativePrintSelection: mockResolveCatalog,
}));

const checkoutUrl = "https://checkout.stripe.com/pay/cs_test_session";

// Helper to create a mock SvelteKit RequestEvent
function makeRequest(body: unknown, ip = "127.0.0.1") {
	return {
		request: {
			json: vi.fn(() => Promise.resolve(body)),
			text: () => Promise.resolve(JSON.stringify(body)),
			headers: { get: () => null },
		},
		params: {},
		url: new URL("http://localhost/api/checkout"),
		route: { id: "/api/checkout" },
		fetch: vi.fn(),
		getClientAddress: () => ip,
		locals: {},
		platform: undefined,
		setHeaders: vi.fn(),
		isDataRequest: false,
		isSubRequest: false,
		cookies: { get: vi.fn(), set: vi.fn(), delete: vi.fn(), serialize: vi.fn(), getAll: vi.fn() },
	};
}

describe("POST /api/checkout", () => {
	it("enables handle mode only for the exact value and rejects stale attempts", () => {
		expect([undefined, "", "HANDLE-V2", "legacy"].map(checkoutSnapshotMode)).toEqual([
			"legacy",
			"legacy",
			"legacy",
			"legacy",
		]);
		expect(() =>
			validateCheckoutAttempt(
				{
					attempt: "123e4567-e89b-42d3-a456-426614174000",
					attemptStartedAt: 1,
				},
				100_000_000,
			),
		).toThrow("Checkout attempt rejected");
	});

	let POST: (event: ReturnType<typeof makeRequest>) => Promise<Response>;

	beforeEach(async () => {
		vi.clearAllMocks();
		delete (env as Record<string, string | undefined>).CHECKOUT_SNAPSHOT_MODE;
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

		expect(mockResolveCatalog).not.toHaveBeenCalled();
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

	it("challenges the exact legacy intent before catalog or bridge effects in strict handle mode", async () => {
		(env as Record<string, string | undefined>).CHECKOUT_SNAPSHOT_MODE = "handle-v2";
		const request = makeRequest(
			{ productSlug: "spring", imageUrl: "https://legacy.test/image" },
			"handle-challenge",
		);
		const response = await POST(request as never);
		expect(response.status).toBe(428);
		await expect(response.json()).resolves.toMatchObject({
			code: "CHECKOUT_ATTEMPT_REQUIRED",
			details: {
				attempt: expect.stringMatching(
					/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
				),
				attemptStartedAt: expect.any(Number),
			},
		});
		expect(mockResolveCatalog).not.toHaveBeenCalled();
		expect(mockCreateHubPrintCheckoutSession).not.toHaveBeenCalled();
	});

	it("rate-limits the eleventh request before body parse, catalog query, or bridge", async () => {
		(env as Record<string, string | undefined>).CHECKOUT_SNAPSHOT_MODE = "handle-v2";
		for (let count = 0; count < 10; count += 1) {
			expect((await POST(makeRequest({}, "rate-handle") as never)).status).toBe(428);
		}
		const eleventh = makeRequest({}, "rate-handle");
		await expect(POST(eleventh as never)).rejects.toMatchObject({ status: 429 });
		expect(eleventh.request.json).not.toHaveBeenCalled();
		expect(mockResolveCatalog).not.toHaveBeenCalled();
		expect(mockCreateHubPrintCheckoutSession).not.toHaveBeenCalled();
	});
});
