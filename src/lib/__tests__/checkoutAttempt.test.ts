import { describe, expect, it, vi } from "vitest";
import { CheckoutAttemptTracker, postCheckoutWithChallenge } from "$lib/client/checkoutAttempt";

const ATTEMPT_A = "123e4567-e89b-42d3-a456-426614174000";
const ATTEMPT_B = "223e4567-e89b-42d3-a456-426614174001";
const selectors = { productSlug: "spring", materialSlug: "archival-matte", sizeSlug: "8x10" };
const legacyBody = JSON.stringify({
	productSlug: "spring",
	imageUrl: "https://legacy.test/image.jpg",
	imageTitle: "Spring",
	paperName: "Archival Matte",
	paperSubcategoryId: 103001,
	paperWidth: 8,
	paperHeight: 10,
	paperSizeLabel: "8×10",
	priceInDollars: 35,
});

function challenge(attempt: string, attemptStartedAt = 1_000) {
	return new Response(
		JSON.stringify({
			code: "CHECKOUT_ATTEMPT_REQUIRED",
			details: { attempt, attemptStartedAt },
		}),
		{ status: 428 },
	);
}

function bodies(fetcher: ReturnType<typeof vi.fn>) {
	return fetcher.mock.calls.map(([, init]) => String(init?.body));
}

describe("checkout attempt browser transport", () => {
	it("sends the exact legacy bytes and stops when default mode does not challenge", async () => {
		const fetcher = vi.fn(
			async () => new Response(JSON.stringify({ url: "https://checkout.stripe.test/session" })),
		);
		const result = await postCheckoutWithChallenge(
			legacyBody,
			selectors,
			new CheckoutAttemptTracker(),
			fetcher,
		);
		expect(result.result).toEqual({ url: "https://checkout.stripe.test/session" });
		expect(bodies(fetcher)).toEqual([legacyBody]);
	});

	it("retries with selectors and the challenged attempt, then clears after a URL", async () => {
		const fetcher = vi
			.fn()
			.mockResolvedValueOnce(challenge(ATTEMPT_A))
			.mockResolvedValueOnce(new Response(JSON.stringify({ url: "https://checkout.test/a" })))
			.mockResolvedValueOnce(challenge(ATTEMPT_B))
			.mockResolvedValueOnce(new Response(JSON.stringify({ url: "https://checkout.test/b" })));
		const tracker = new CheckoutAttemptTracker();
		await postCheckoutWithChallenge(legacyBody, selectors, tracker, fetcher);
		await postCheckoutWithChallenge(legacyBody, selectors, tracker, fetcher);
		expect(bodies(fetcher)).toEqual([
			legacyBody,
			JSON.stringify({ ...selectors, attempt: ATTEMPT_A, attemptStartedAt: 1_000 }),
			legacyBody,
			JSON.stringify({ ...selectors, attempt: ATTEMPT_B, attemptStartedAt: 1_000 }),
		]);
	});

	it("retains an attempt across an ambiguous retry and rotates on selector change", async () => {
		const fetcher = vi
			.fn()
			.mockResolvedValueOnce(challenge(ATTEMPT_A))
			.mockRejectedValueOnce(new TypeError("network interrupted"))
			.mockResolvedValueOnce(challenge(ATTEMPT_B))
			.mockResolvedValueOnce(new Response("temporary", { status: 503 }))
			.mockResolvedValueOnce(challenge(ATTEMPT_B))
			.mockResolvedValueOnce(new Response(JSON.stringify({ url: "https://checkout.test/new" })));
		const tracker = new CheckoutAttemptTracker();
		await expect(
			postCheckoutWithChallenge(legacyBody, selectors, tracker, fetcher),
		).rejects.toThrow();
		await postCheckoutWithChallenge(legacyBody, selectors, tracker, fetcher);
		const changed = { ...selectors, sizeSlug: "11x14" };
		await postCheckoutWithChallenge(legacyBody, changed, tracker, fetcher);
		expect(JSON.parse(bodies(fetcher)[3] ?? "{}")).toMatchObject({ attempt: ATTEMPT_A });
		expect(JSON.parse(bodies(fetcher)[5] ?? "{}")).toMatchObject({
			attempt: ATTEMPT_B,
			sizeSlug: "11x14",
		});
	});

	it("rotates locally expired attempts and clears definitive rejections", async () => {
		let now = 0;
		const tracker = new CheckoutAttemptTracker(() => now);
		expect(tracker.forIntent(selectors, { attempt: ATTEMPT_A, attemptStartedAt: 1 }).attempt).toBe(
			ATTEMPT_A,
		);
		now = (23 * 60 + 25) * 60 * 1000;
		expect(tracker.forIntent(selectors, { attempt: ATTEMPT_B, attemptStartedAt: 2 }).attempt).toBe(
			ATTEMPT_B,
		);
		tracker.discard(ATTEMPT_B);
		expect(tracker.forIntent(selectors, { attempt: ATTEMPT_A, attemptStartedAt: 3 }).attempt).toBe(
			ATTEMPT_A,
		);
	});
});
