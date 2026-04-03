import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Order } from "../../lib/shop/types";

// ─── Module Mocks ─────────────────────────────────────────────────────────────

const mockFindOrder = vi.fn();
const mockUpdateOrder = vi.fn();

vi.mock("../../lib/server/sanity", () => ({
	findOrderByLumaprintsNumber: mockFindOrder,
	updateSanityOrder: mockUpdateOrder,
}));

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeRequest(body: unknown) {
	return {
		request: {
			json: () => Promise.resolve(body),
			text: () => Promise.resolve(JSON.stringify(body)),
			headers: { get: () => null },
		},
	};
}

const MOCK_ORDER: Order = {
	_id: "sanity-order-xyz",
	stripeSessionId: "cs_test_abc",
	customerName: "Jane Doe",
	customerEmail: "jane@example.com",
	status: "printing",
	paperName: "Archival Matte",
	paperSize: "8×10",
	amount: 35,
	lumaprintsOrderNumber: "LP-55555",
	createdAt: new Date().toISOString(),
};

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("POST /api/webhooks/lumaprints", () => {
	let POST: (event: ReturnType<typeof makeRequest>) => Promise<Response>;

	beforeEach(async () => {
		vi.clearAllMocks();
		vi.resetModules();

		vi.mock("../../lib/server/sanity", () => ({
			findOrderByLumaprintsNumber: mockFindOrder,
			updateSanityOrder: mockUpdateOrder,
		}));

		const mod = await import("../../routes/api/webhooks/lumaprints/+server");
		POST = mod.POST as unknown as typeof POST;
	});

	it("returns 200 on a valid shipment.created event", async () => {
		mockFindOrder.mockResolvedValue(MOCK_ORDER);
		mockUpdateOrder.mockResolvedValue(undefined);

		const req = makeRequest({
			event: "shipment.created",
			data: {
				orderNumber: "LP-55555",
				trackingNumber: "1Z999AA10123456784",
				trackingUrl: "https://ups.com/track?tracknum=1Z999AA10123456784",
				carrier: "UPS",
			},
		});

		const response = await POST(req as never);
		expect(response.status).toBe(200);
		const data = await response.json();
		expect(data.received).toBe(true);
	});

	it("updates Sanity order with tracking info on shipment.created", async () => {
		mockFindOrder.mockResolvedValue(MOCK_ORDER);
		mockUpdateOrder.mockResolvedValue(undefined);

		const req = makeRequest({
			event: "shipment.created",
			data: {
				orderNumber: "LP-55555",
				trackingNumber: "1Z999AA10123456784",
				trackingUrl: "https://ups.com/track?tracknum=1Z999AA10123456784",
				carrier: "UPS",
			},
		});

		await POST(req as never);

		expect(mockUpdateOrder).toHaveBeenCalledWith(
			"sanity-order-xyz",
			expect.objectContaining({
				status: "shipped",
				trackingNumber: "1Z999AA10123456784",
				trackingUrl: "https://ups.com/track?tracknum=1Z999AA10123456784",
				shippingCarrier: "UPS",
			}),
		);
		// shippedAt should be a valid ISO date string
		const call = mockUpdateOrder.mock.calls[0][1];
		expect(typeof call.shippedAt).toBe("string");
		expect(new Date(call.shippedAt).getTime()).not.toBeNaN();
	});

	it("handles unknown order gracefully (no Sanity update)", async () => {
		mockFindOrder.mockResolvedValue(null); // order not found

		const req = makeRequest({
			event: "shipment.created",
			data: {
				orderNumber: "LP-UNKNOWN",
				trackingNumber: "1Z000",
				carrier: "FedEx",
			},
		});

		const response = await POST(req as never);
		expect(response.status).toBe(200);
		expect(mockUpdateOrder).not.toHaveBeenCalled();
	});

	it("returns 400 when orderNumber is missing from shipment.created", async () => {
		const req = makeRequest({
			event: "shipment.created",
			data: {
				// no orderNumber
				trackingNumber: "1Z999",
			},
		});

		const response = await POST(req as never);
		expect(response.status).toBe(400);
	});

	it("returns 200 and ignores unknown event types", async () => {
		const req = makeRequest({
			event: "order.updated",
			data: { orderNumber: "LP-12345" },
		});

		const response = await POST(req as never);
		expect(response.status).toBe(200);
		expect(mockFindOrder).not.toHaveBeenCalled();
		expect(mockUpdateOrder).not.toHaveBeenCalled();
	});

	it("returns 400 for invalid JSON", async () => {
		const req = {
			request: {
				json: () => Promise.reject(new SyntaxError("Unexpected token")),
			},
		};

		const response = await POST(req as never);
		expect(response.status).toBe(400);
	});

	it("returns 200 even when Sanity update throws (do not crash)", async () => {
		mockFindOrder.mockResolvedValue(MOCK_ORDER);
		mockUpdateOrder.mockRejectedValue(new Error("Sanity connection timeout"));

		const req = makeRequest({
			event: "shipment.created",
			data: {
				orderNumber: "LP-55555",
				trackingNumber: "1Z999",
				carrier: "USPS",
			},
		});

		const response = await POST(req as never);
		// Should not throw 500 — return 200 and let it be handled manually
		expect(response.status).toBe(200);
	});
});
