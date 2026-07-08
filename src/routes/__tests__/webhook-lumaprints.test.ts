import { beforeEach, describe, expect, it, vi } from "vitest";

// ─── Module Mocks ─────────────────────────────────────────────────────────────

const { mockResendSend } = vi.hoisted(() => ({
	mockResendSend: vi.fn(),
}));

const mockConvexQuery = vi.fn();
const mockConvexMutation = vi.fn();

vi.mock("resend", () => ({
	Resend: vi.fn(function Resend() {
		return {
			emails: {
				send: mockResendSend,
			},
		};
	}),
}));

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
		RESEND_API_KEY: "test-resend",
		FROM_EMAIL: "Reflecting Pool <orders@example.test>",
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
	customerEmail: "jane@example.com",
};

const MOCK_CLAIM = {
	claimed: true,
	order: MOCK_ORDER,
};

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("POST /api/webhooks/lumaprints", () => {
	let POST: (event: ReturnType<typeof makeRequest>) => Promise<Response>;

	beforeEach(async () => {
		vi.clearAllMocks();
		vi.resetModules();
		mockResendSend.mockResolvedValue({ id: "email_123" });

		const mod = await import("../../routes/api/webhooks/lumaprints/+server");
		POST = mod.POST as unknown as typeof POST;
	});

	it("returns 200 on a valid shipment.created event", async () => {
		mockConvexMutation.mockResolvedValue(MOCK_CLAIM);

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

	it("claims the shipment email while updating Convex order tracking on shipment.created", async () => {
		mockConvexMutation.mockResolvedValue(MOCK_CLAIM);

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

		expect(mockConvexQuery).not.toHaveBeenCalled();

		const [, claimArgs] = mockConvexMutation.mock.calls[0];
		expect(claimArgs).toMatchObject({
			webhookSecret: "test-webhook-secret",
			siteUrl: "zippymiggy.com",
			lumaprintsOrderNumber: "LP-55555",
			trackingNumber: "1Z999AA10123456784",
			trackingUrl: "https://ups.com/track?tracknum=1Z999AA10123456784",
		});
	});

	it("emails the customer with tracking info after marking the order shipped", async () => {
		mockConvexMutation.mockResolvedValue(MOCK_CLAIM);

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

		expect(mockResendSend).toHaveBeenCalledTimes(1);
		expect(mockResendSend).toHaveBeenCalledWith(
			expect.objectContaining({
				from: "Reflecting Pool <orders@example.test>",
				to: "jane@example.com",
				subject: "your reflecting pool order ORD-00099 has shipped",
				html: expect.stringContaining("https://ups.com/track?tracknum=1Z999AA10123456784"),
			}),
		);
	});

	it("does not send a shipment email when the order has no customer email", async () => {
		mockConvexMutation.mockResolvedValue({
			claimed: true,
			order: { ...MOCK_ORDER, customerEmail: "" },
		});

		const req = makeRequest({
			body: {
				event: "shipment.created",
				data: {
					orderNumber: "LP-55555",
					trackingNumber: "1Z999AA10123456784",
				},
			},
		});

		await POST(req as never);

		expect(mockConvexMutation).toHaveBeenCalled();
		expect(mockResendSend).not.toHaveBeenCalled();
	});

	it("does not send a duplicate shipment email when Convex does not claim it", async () => {
		mockConvexMutation.mockResolvedValue({
			claimed: false,
			order: MOCK_ORDER,
		});

		const req = makeRequest({
			body: {
				event: "shipment.created",
				data: {
					orderNumber: "LP-55555",
					trackingNumber: "1Z999AA10123456784",
				},
			},
		});

		await POST(req as never);

		expect(mockConvexMutation).toHaveBeenCalledWith(
			expect.anything(),
			expect.objectContaining({
				lumaprintsOrderNumber: "LP-55555",
				trackingNumber: "1Z999AA10123456784",
			}),
		);
		expect(mockResendSend).not.toHaveBeenCalled();
	});

	it("sends once across sequential shipment webhook replay results", async () => {
		mockConvexMutation
			.mockResolvedValueOnce(MOCK_CLAIM)
			.mockResolvedValueOnce({ claimed: false, order: MOCK_ORDER });

		const requestBody = {
			event: "shipment.created",
			data: {
				orderNumber: "LP-55555",
				trackingNumber: "1Z999AA10123456784",
			},
		};

		const firstResponse = await POST(makeRequest({ body: requestBody }) as never);
		const secondResponse = await POST(makeRequest({ body: requestBody }) as never);

		expect(firstResponse.status).toBe(200);
		expect(secondResponse.status).toBe(200);
		expect(mockConvexMutation).toHaveBeenCalledTimes(2);
		expect(mockResendSend).toHaveBeenCalledTimes(1);
	});

	it("does not render non-http tracking URLs as clickable email links", async () => {
		mockConvexMutation.mockResolvedValue(MOCK_CLAIM);

		const req = makeRequest({
			body: {
				event: "shipment.created",
				data: {
					orderNumber: "LP-55555",
					trackingUrl: "javascript:alert(1)",
				},
			},
		});

		await POST(req as never);

		expect(mockResendSend).toHaveBeenCalledWith(
			expect.objectContaining({
				html: expect.stringContaining("tracking link:</strong> javascript:alert(1)"),
			}),
		);
		expect(mockResendSend.mock.calls[0][0].html).not.toContain('href="javascript:');
	});

	it("still returns 200 when the shipment email send fails", async () => {
		mockConvexMutation.mockResolvedValue(MOCK_CLAIM);
		mockResendSend.mockRejectedValue(new Error("Resend unavailable"));

		const req = makeRequest({
			body: {
				event: "shipment.created",
				data: {
					orderNumber: "LP-55555",
					trackingNumber: "1Z999AA10123456784",
				},
			},
		});

		const response = await POST(req as never);

		expect(response.status).toBe(200);
		expect(mockConvexMutation).toHaveBeenCalled();
		expect(mockResendSend).toHaveBeenCalledTimes(1);
	});

	it("still returns 200 when Resend returns an error result", async () => {
		mockConvexMutation.mockResolvedValue(MOCK_CLAIM);
		mockResendSend.mockResolvedValue({ data: null, error: { message: "invalid sender" } });

		const req = makeRequest({
			body: {
				event: "shipment.created",
				data: {
					orderNumber: "LP-55555",
					trackingNumber: "1Z999AA10123456784",
				},
			},
		});

		const response = await POST(req as never);

		expect(response.status).toBe(200);
		expect(mockConvexMutation).toHaveBeenCalled();
		expect(mockResendSend).toHaveBeenCalledTimes(1);
	});

	it("handles unknown order gracefully without sending email", async () => {
		mockConvexMutation.mockResolvedValue(null); // order not found

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
		expect(mockConvexMutation).toHaveBeenCalledTimes(1);
		expect(mockResendSend).not.toHaveBeenCalled();
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

	it("returns 503 when the shared Convex claim mutation is not deployed yet", async () => {
		mockConvexMutation.mockRejectedValue(
			new Error("Could not find public function orders.claimShipmentEmailNotification"),
		);

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
		expect(response.status).toBe(503);
		expect(mockResendSend).not.toHaveBeenCalled();
	});

	it("returns 503 when the Convex claim request has a transient network failure", async () => {
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
		expect(response.status).toBe(503);
		expect(mockResendSend).not.toHaveBeenCalled();
	});

	it("returns 200 when Convex reports a permanent shipment claim error", async () => {
		mockConvexMutation.mockRejectedValue(new Error("Duplicate LumaPrints order number"));

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
		expect(response.status).toBe(200);
		expect(mockResendSend).not.toHaveBeenCalled();
	});
});
