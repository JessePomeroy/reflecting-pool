import { json } from "@sveltejs/kit";
import { Resend } from "resend";
import { env } from "$env/dynamic/private";
import { PUBLIC_SITE_URL } from "$env/static/public";
import { escapeHtml } from "$lib/server/html";
import { rateLimit } from "$lib/server/rate-limit";
import { verifyTurnstileToken } from "$lib/server/turnstile";
import type { RequestHandler } from "./$types";

// Resend is lazy-initialized to keep builds green while per-tenant email
// credentials are still being wired during onboarding. The handler only runs
// at request time, so first-use construction is fine.

// Configurable recipient — set CONTACT_EMAIL in env, else fall back to a placeholder
const RECIPIENT_EMAIL = "hello@margarethelena.com";

let _resend: Resend | null = null;
function resend(): Resend {
	if (!_resend) _resend = new Resend(env.RESEND_API_KEY);
	return _resend;
}

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

	const payload = body as Record<string, unknown>;
	const verification = await verifyTurnstileToken({
		token: payload["cf-turnstile-response"],
		remoteIp: ip,
	});
	if (!verification.success) {
		const status = verification.reason === "unavailable" ? 503 : 403;
		return json({ error: "verification failed — please try again" }, { status });
	}

	const { name, email, subject, message } = validation.data;
	const submittedAt = new Date().toISOString();

	try {
		await resend().emails.send({
			from: "margaret helena · contact <onboarding@resend.dev>",
			to: [RECIPIENT_EMAIL],
			replyTo: email,
			subject: `[contact] ${subject}`,
			html: `
				<div style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto; color: #1a1f2e;">
					<h2 style="font-weight: 400; font-size: 1.5rem; margin-bottom: 1rem;">${escapeHtml(subject)}</h2>
					<p style="margin-bottom: 0.5rem;"><strong>from:</strong> ${escapeHtml(name)} &lt;${escapeHtml(email)}&gt;</p>
					<hr style="border: none; border-top: 1px solid rgba(26,31,46,0.15); margin: 1rem 0;" />
					<p style="line-height: 1.6; white-space: pre-wrap;">${escapeHtml(message)}</p>
					<hr style="border: none; border-top: 1px solid rgba(26,31,46,0.15); margin: 1rem 0;" />
					<p style="font-size: 0.8rem; color: rgba(26,31,46,0.4);">received ${escapeHtml(submittedAt)} via ${escapeHtml(PUBLIC_SITE_URL ?? "margarethelena.com")}</p>
				</div>
			`,
		});
	} catch (err) {
		console.error("[contact] email send failed:", err);
		return json({ error: "could not send message — please try again" }, { status: 500 });
	}

	// TODO: persist this payload to shared Convex inquiries once the
	// inquiries module is ported into the shared CRM API. Sanity remains
	// CMS-only and should not receive contact submissions.

	return json({ ok: true }, { status: 200 });
};
