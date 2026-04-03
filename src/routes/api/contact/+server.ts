import { createClient } from "@sanity/client";
import { json } from "@sveltejs/kit";
import { Resend } from "resend";
import {
	RESEND_API_KEY,
	SANITY_API_TOKEN,
	SANITY_DATASET,
	SANITY_PROJECT_ID,
} from "$env/static/private";
import { PUBLIC_SITE_URL } from "$env/static/public";
import { rateLimit } from "$lib/server/rate-limit";
import type { RequestHandler } from "./$types";

// Configurable recipient — set CONTACT_EMAIL in env, else fall back to a placeholder
const RECIPIENT_EMAIL = "hello@margarethelena.com";

const resend = new Resend(RESEND_API_KEY);

const sanity = createClient({
	projectId: SANITY_PROJECT_ID,
	dataset: SANITY_DATASET,
	token: SANITY_API_TOKEN,
	apiVersion: "2024-01-01",
	useCdn: false,
});

interface ContactPayload {
	name: string;
	email: string;
	subject: string;
	message: string;
}

function validatePayload(
	body: unknown,
): { valid: true; data: ContactPayload } | { valid: false; error: string } {
	if (!body || typeof body !== "object") {
		return { valid: false, error: "invalid request body" };
	}

	const b = body as Record<string, unknown>;

	if (!b.name || typeof b.name !== "string" || b.name.trim().length === 0) {
		return { valid: false, error: "name is required" };
	}
	if (!b.email || typeof b.email !== "string" || !b.email.includes("@")) {
		return { valid: false, error: "valid email is required" };
	}
	if (!b.subject || typeof b.subject !== "string" || b.subject.trim().length === 0) {
		return { valid: false, error: "subject is required" };
	}
	if (!b.message || typeof b.message !== "string" || b.message.trim().length === 0) {
		return { valid: false, error: "message is required" };
	}

	return {
		valid: true,
		data: {
			name: b.name.trim(),
			email: b.email.trim(),
			subject: b.subject.trim(),
			message: b.message.trim(),
		},
	};
}

export const POST: RequestHandler = async ({ request, getClientAddress }) => {
	// Rate limiting: 5 requests per minute per IP
	const ip = getClientAddress();
	const { allowed } = rateLimit(ip, 5, 60_000);
	if (!allowed) {
		return json({ error: "too many requests — please try again later" }, { status: 429 });
	}

	let body: unknown;

	try {
		body = await request.json();
	} catch {
		return json({ error: "invalid json" }, { status: 400 });
	}

	const validation = validatePayload(body);
	if (!validation.valid) {
		return json({ error: validation.error }, { status: 422 });
	}

	const { name, email, subject, message } = validation.data;
	const submittedAt = new Date().toISOString();

	// Run email + Sanity in parallel; don't let one failure block the other
	const [emailResult, sanityResult] = await Promise.allSettled([
		// Send email via Resend
		resend.emails.send({
			from: "margaret helena · contact <onboarding@resend.dev>",
			to: [RECIPIENT_EMAIL],
			replyTo: email,
			subject: `[contact] ${subject}`,
			html: `
				<div style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto; color: #1a1f2e;">
					<h2 style="font-weight: 400; font-size: 1.5rem; margin-bottom: 1rem;">${subject}</h2>
					<p style="margin-bottom: 0.5rem;"><strong>from:</strong> ${name} &lt;${email}&gt;</p>
					<hr style="border: none; border-top: 1px solid rgba(26,31,46,0.15); margin: 1rem 0;" />
					<p style="line-height: 1.6; white-space: pre-wrap;">${message}</p>
					<hr style="border: none; border-top: 1px solid rgba(26,31,46,0.15); margin: 1rem 0;" />
					<p style="font-size: 0.8rem; color: rgba(26,31,46,0.4);">received ${submittedAt} via ${PUBLIC_SITE_URL ?? "margarethelena.com"}</p>
				</div>
			`,
		}),

		// Create inquiry document in Sanity
		sanity.create({
			_type: "inquiry",
			name,
			email,
			sessionType: subject,
			message,
			status: "new",
			submittedAt,
		}),
	]);

	// Log failures but don't surface Sanity errors to user (email is enough)
	if (emailResult.status === "rejected") {
		console.error("[contact] email send failed:", emailResult.reason);
		return json({ error: "could not send message — please try again" }, { status: 500 });
	}

	if (sanityResult.status === "rejected") {
		console.error("[contact] sanity create failed:", sanityResult.reason);
		// Non-fatal — email was sent, just log it
	}

	return json({ ok: true }, { status: 200 });
};
