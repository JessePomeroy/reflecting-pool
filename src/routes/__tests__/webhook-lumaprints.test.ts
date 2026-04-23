import { beforeEach, describe, expect, it, vi } from "vitest";

// ─── Module Mocks ─────────────────────────────────────────────────────────────

const mockConvexQuery = vi.fn();
const mockConvexMutation = vi.fn();

vi.mock("../../lib/server/convexClient", () => ({
	getConvex: () => ({
		query: mockConvexQuery,
		mutation: mockConvexMutation,
	}),
}));

// The webhook pulls `env.WEBHOOK_SECRET` + the LumaPrints verification
// secrets from `$env/dynamic/private`. Stub a signing + shared secret so
// `verifyCaller` accepts the requests below. Tests that need unauth'd
// responses override the signing path via headers.
vi.mock("$env/dynamic/private", () => ({
	env: {
		WEBHOOK_SECRET: "test-webhook-secret",
		LUMAPRINTS_WEBHOOK_SECRET: "test-shared-secret",
		LUMAPRINTS_WEBHOOK_SIGNING_SECRET: "",
	},
}));

// ─── Helpers ──────────────────────────────────────────────────────────────────

type MakeRequestOpts = {
	body: unknown;
	// ?token=... in the URL. Explicit `null` to test the unauth path; default
	// applied via `??` below so passing `token: undefined` in destructuring
	// *also* takes the default. We only skip the token query-string when the
	// caller passes `null` explicitly.
	token?: string | null;
};

function makeRequest({ body, token }: MakeRequestOpts) {
	const rawBody = JSON.stringify(body);
	const resolvedToken = token === null ? null : (token ?? "test-shared-secret");
	const urlString = `https://example.test/api/webhooks/lumaprints${resolvedToken ? `?token=${encodeURIComponent(resolvedToken)}` : ""}`;
	return {
		request: {
			text: () => Promise.resolve(rawBody),
			headers: { get: (_: string) => null },
		},
		url: new URL(urlString),
	};
}

const MOCK_ORDER = {
	_id: "j9zxxxx",
	orderNumber: "ORD-00099",
	status: "printing" as const,
	customerEmail: "jane@example.com",
	trackingNumber: undefined,
	trackingUrl: undefined,
};

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("POST /api/webhooks/lumaprints", () => {
	let POST: (event: ReturnType<typeof makeRequest>) => Promise<Response>;

	beforeEach(async () => {
		vi.clearAllMocks();
		vi.resetModules();

		const mod = await import("../../routes/api/webhooks/lumaprints/+server");
		POST = mod.POST as unknown as typeof POST;
	});

	it("returns 200 on a valid shipment.created event", async () => {
		mockConvexQuery.mockResolvedValue(MOCK_ORDER);
		mockConvexMutation.mockResolvedValue(undefined);

		const req = makeRequest({
			body: {
				event: "shipment.created",
				data: {
					orderNumber: "LP-55555",
					trackingNumber: "1Z999AA10123456784",
					trackingUrl: "https://ups.com/track?tracknum=1Z999AA10123456784",
					carrier: "UPS",
				},
			},
		});

		const response = await POST(req as never);
		expect(response.status).toBe(200);
		const data = await response.json();
		expect(data.received).toBe(true);
	});

	it("updates Convex order with tracking info on shipment.created", async () => {
		mockConvexQuery.mockResolvedValue(MOCK_ORDER);
		mockConvexMutation.mockResolvedValue(undefined);

		const req = makeRequest({
			body: {
				event: "shipment.created",
				data: {
					orderNumber: "LP-55555",
					trackingNumber: "1Z999AA10123456784",
					trackingUrl: "https://ups.com/track?tracknum=1Z999AA10123456784",
					carrier: "UPS",
				},
			},
		});

		await POST(req as never);

		// Lookup goes through `api.orders.getByLumaprintsOrderNumber`
		const [, queryArgs] = mockConvexQuery.mock.calls[0];
		expect(queryArgs).toMatchObject({
			webhookSecret: "test-webhook-secret",
			siteUrl: "zippymiggy.com",
			lumaprintsOrderNumber: "LP-55555",
		});

		// Then orders.updateStatus with tracking
		const [, updateArgs] = mockConvexMutation.mock.calls[0];
		expect(updateArgs).toMatchObject({
			orderId: MOCK_ORDER._id,
			status: "shipped",
			trackingNumber: "1Z999AA10123456784",
			trackingUrl: "https://ups.com/track?tracknum=1Z999AA10123456784",
		});
	});

	it("handles unknown order gracefully (no Convex mutation)", async () => {
		mockConvexQuery.mockResolvedValue(null); // order not found

		const req = makeRequest({
			body: {
				event: "shipment.created",
				data: {
					orderNumber: "LP-UNKNOWN",
					trackingNumber: "1Z000",
					carrier: "FedEx",
				},
			},
		});

		const response = await POST(req as never);
		expect(response.status).toBe(200);
		expect(mockConvexMutation).not.toHaveBeenCalled();
	});

	it("returns 400 when orderNumber is missing from shipment.created", async () => {
		const req = makeRequest({
			body: {
				event: "shipment.created",
				data: {
					// no orderNumber
					trackingNumber: "1Z999",
				},
			},
		});

		const response = await POST(req as never);
		expect(response.status).toBe(400);
	});

	it("returns 200 and ignores unknown event types", async () => {
		const req = makeRequest({
			body: {
				event: "order.updated",
				data: { orderNumber: "LP-12345" },
			},
		});

		const response = await POST(req as never);
		expect(response.status).toBe(200);
		expect(mockConvexQuery).not.toHaveBeenCalled();
		expect(mockConvexMutation).not.toHaveBeenCalled();
	});

	it("returns 401 when caller presents no shared token", async () => {
		const req = makeRequest({
			body: { event: "shipment.created", data: { orderNumber: "LP-1" } },
			token: null,
		});

		const response = await POST(req as never);
		expect(response.status).toBe(401);
		expect(mockConvexQuery).not.toHaveBeenCalled();
	});

	it("returns 200 even when Convex update throws (do not crash)", async () => {
		mockConvexQuery.mockResolvedValue(MOCK_ORDER);
		mockConvexMutation.mockRejectedValue(new Error("Convex connection timeout"));

		const req = makeRequest({
			body: {
				event: "shipment.created",
				data: {
					orderNumber: "LP-55555",
					trackingNumber: "1Z999",
					carrier: "USPS",
				},
			},
		});

		const response = await POST(req as never);
		// Should not throw 500 — return 200 and let it be handled manually
		expect(response.status).toBe(200);
	});
});
