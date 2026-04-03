import { error, json } from "@sveltejs/kit";
import { getMockInquiries } from "$lib/admin/data";
import type { RequestHandler } from "./$types";

type InquiryStatus = "new" | "read" | "replied";
const VALID_STATUSES: InquiryStatus[] = ["new", "read", "replied"];

export const PATCH: RequestHandler = async ({ params, request }) => {
	// TODO: Add auth middleware — check for admin session/cookie before allowing access

	const { id } = params;
	const inquiries = getMockInquiries();
	const inquiry = inquiries.find((i) => i._id === id);

	if (!inquiry) {
		error(404, { message: "Inquiry not found" });
	}

	const body = await request.json();
	const updates: Record<string, unknown> = {};

	if ("status" in body) {
		const status = body.status as string;
		if (!VALID_STATUSES.includes(status as InquiryStatus)) {
			error(400, { message: `Invalid status: ${status}` });
		}
		updates.status = status;
		inquiry.status = status as InquiryStatus;
	}

	// TODO: Persist to Sanity when connected:
	// await sanityClient.patch(id).set(updates).commit()

	return json({ success: true, id, updates });
};
