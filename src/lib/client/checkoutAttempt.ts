export interface CheckoutAttempt {
	attempt: string;
	attemptStartedAt: number;
}

const MAX_LOCAL_AGE_MS = (23 * 60 + 25) * 60 * 1000;
const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
export const CHECKOUT_ATTEMPT_REQUIRED = "CHECKOUT_ATTEMPT_REQUIRED";

export class CheckoutAttemptTracker {
	#current: (CheckoutAttempt & { intent: string; retainedAt: number }) | null = null;

	constructor(private readonly now = () => Date.now()) {}

	forIntent(intent: unknown, challenge: CheckoutAttempt) {
		const serialized = JSON.stringify(intent);
		const now = this.now();
		if (
			!this.#current ||
			this.#current.intent !== serialized ||
			now - this.#current.retainedAt >= MAX_LOCAL_AGE_MS
		) {
			if (!UUID_V4.test(challenge.attempt) || !Number.isSafeInteger(challenge.attemptStartedAt)) {
				throw new Error("checkout failed");
			}
			this.#current = { ...challenge, intent: serialized, retainedAt: now };
		}
		return { attempt: this.#current.attempt, attemptStartedAt: this.#current.attemptStartedAt };
	}

	discard(attempt: string) {
		if (this.#current?.attempt === attempt) this.#current = null;
	}
}

function challengeFrom(value: unknown): CheckoutAttempt | null {
	if (!value || typeof value !== "object" || Array.isArray(value)) return null;
	const record = value as Record<string, unknown>;
	const details = record.details;
	if (
		record.code !== CHECKOUT_ATTEMPT_REQUIRED ||
		!details ||
		typeof details !== "object" ||
		Array.isArray(details)
	) {
		return null;
	}
	const candidate = details as Record<string, unknown>;
	return typeof candidate.attempt === "string" && typeof candidate.attemptStartedAt === "number"
		? { attempt: candidate.attempt, attemptStartedAt: candidate.attemptStartedAt }
		: null;
}

async function responseValue(response: Response) {
	const text = await response.text();
	try {
		return { text, json: JSON.parse(text) as unknown };
	} catch {
		return { text, json: null };
	}
}

export async function postCheckoutWithChallenge(
	legacyBodyText: string,
	selectors: { productSlug: string; materialSlug: string; sizeSlug: string },
	tracker: CheckoutAttemptTracker,
	fetcher: typeof fetch = fetch,
) {
	const send = (body: string) =>
		fetcher("/api/checkout", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body,
		});
	let response = await send(legacyBodyText);
	let value = await responseValue(response);
	const challenge = challengeFrom(value.json);
	let attempt: CheckoutAttempt | null = null;
	if (response.status === 428 && challenge) {
		attempt = tracker.forIntent(selectors, challenge);
		response = await send(JSON.stringify({ ...selectors, ...attempt }));
		value = await responseValue(response);
	}
	const result = value.json as Record<string, unknown> | null;
	if (
		attempt &&
		(typeof result?.url === "string" || (response.status >= 400 && response.status < 500))
	) {
		tracker.discard(attempt.attempt);
	}
	return { response, result, text: value.text };
}
