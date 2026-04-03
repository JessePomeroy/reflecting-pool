import { error, json } from "@sveltejs/kit";
import { getMockOrders } from "$lib/admin/data";
import type { OrderStatus } from "$lib/shop/types";
import type { RequestHandler } from "./$types";

const VALID_STATUSES: OrderStatus[] = [
	"processing",
	"submitted",
	"printing",
	"shipped",
	"delivered",
	"fulfillment_error",
	"cancelled",
	"refunded",
];

export const PATCH: RequestHandler = async ({ params, request }) => {
	// TODO: Add auth middleware — check for admin session/cookie before allowing access

	const { id } = params;
	const orders = getMockOrders();
	const order = orders.find((o) => o._id === id);

	if (!order) {
		error(404, { message: "Order not found" });
	}

	const body = await request.json();
	const updates: Record<string, unknown> = {};

	if ("status" in body) {
		const status = body.status as string;
		if (!VALID_STATUSES.includes(status as OrderStatus)) {
			error(400, { message: `Invalid status: ${status}` });
		}
		updates.status = status;
		order.status = status as OrderStatus;
	}

	if ("internalNotes" in body) {
		const notes = body.internalNotes;
		if (typeof notes !== "string") {
			error(400, { message: "internalNotes must be a string" });
		}
		updates.internalNotes = notes;
		order.internalNotes = notes;
	}

	// TODO: Persist to Sanity when connected:
	// await sanityClient.patch(id).set(updates).commit()

	return json({ success: true, id, updates });
};
