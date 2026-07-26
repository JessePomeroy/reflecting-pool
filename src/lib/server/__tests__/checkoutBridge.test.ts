import { describe, expect, it, vi } from "vitest";
import { createHubPrintCheckoutSession, signCheckoutBridgeBody } from "$lib/server/checkoutBridge";

const metadata = {
	imageUrl: "https://cdn.sanity.io/images/print.jpg",
	imageTitle: "Spring Meadow",
	paperSubcategoryId: "103001",
	paperWidth: "8",
	paperHeight: "10",
	paperName: "Archival Matte",
	paperSizeLabel: "8×10",
	productSlug: "wildflowers--img-01",
};

describe("checkout bridge client", () => {
	it("signs with this tenant's unique server-to-server secret", async () => {
		const fetchMock = vi.fn(async () => {
			return new Response(
				JSON.stringify({
					sessionId: "cs_test_bridge",
					url: "https://checkout.stripe.com/pay/cs_test_bridge",
					platformFeeAmount: 175,
				}),
				{ status: 200 },
			);
		}) as unknown as typeof fetch;

		const result = await createHubPrintCheckoutSession({
			siteUrl: "zippymiggy.com",
			amountCents: 3500,
			productName: "Spring Meadow — 8×10",
			productDescription: "Archival Matte print, 8×10 inches",
			imageUrl: "https://cdn.sanity.io/images/print.jpg",
			metadata,
			successUrl:
				"https://reflecting-pool.vercel.app/shop/success?session_id={CHECKOUT_SESSION_ID}",
			cancelUrl: "https://reflecting-pool.vercel.app/shop/cancelled",
			fetcher: fetchMock,
			now: 1_779_000_000,
		});

		expect(result.url).toBe("https://checkout.stripe.com/pay/cs_test_bridge");
		expect(fetchMock).toHaveBeenCalledOnce();

		const [url, init] = vi.mocked(fetchMock).mock.calls[0];
		expect(url).toBe("https://angelsrest.test/api/tenant-checkout/print");
		expect(init?.method).toBe("POST");
		expect(init?.headers).toMatchObject({
			"content-type": "application/json",
			"x-checkout-bridge-timestamp": "1779000000",
		});

		const bodyText = String(init?.body);
		expect(JSON.parse(bodyText)).toMatchObject({
			siteUrl: "zippymiggy.com",
			amountCents: 3500,
			productName: "Spring Meadow — 8×10",
			metadata,
		});
		expect((init?.headers as Record<string, string>)["x-checkout-bridge-signature"]).toBe(
			signCheckoutBridgeBody({
				bodyText,
				secret: "test-checkout-bridge-secret",
				timestamp: 1_779_000_000,
			}),
		);
	});

	it("stringifies, signs, and sends the exact handle-v2 body text", async () => {
		const fetchMock = vi.fn(
			async () =>
				new Response(
					JSON.stringify({
						sessionId: "cs_handle",
						url: "https://checkout.test",
						platformFeeAmount: 1,
					}),
				),
		) as unknown as typeof fetch;
		const checkoutSnapshot = {
			schemaVersion: 1 as const,
			catalogProvider: "convex" as const,
			items: [
				{
					productKey: "product_123",
					revisionId: "revision_123",
					productKind: "print" as const,
					variantKey: "variant_123",
					materialOptionKey: "archival-matte",
					sizeOptionKey: "8x10",
					borderOptionKey: null,
					frameOptionKey: null,
				},
			] as [
				{
					productKey: string;
					revisionId: string;
					productKind: "print";
					variantKey: string;
					materialOptionKey: string;
					sizeOptionKey: string;
					borderOptionKey: null;
					frameOptionKey: null;
				},
			],
		};
		await createHubPrintCheckoutSession({
			siteUrl: "zippymiggy.com",
			amountCents: 3500,
			productName: "Spring — 8×10",
			productDescription: "Archival Matte print, 8×10 inches",
			imageUrl: metadata.imageUrl,
			metadata,
			successUrl: "https://zippymiggy.com/shop/success",
			cancelUrl: "https://zippymiggy.com/shop/cancelled",
			attempt: "123e4567-e89b-42d3-a456-426614174000",
			attemptStartedAt: 1_779_000_000,
			checkoutSnapshot,
			fetcher: fetchMock,
			now: 1_779_000_001,
		});
		const [, init] = vi.mocked(fetchMock).mock.calls[0];
		const rawBody = String(init?.body);
		expect(JSON.parse(rawBody)).toMatchObject({
			checkoutSnapshot,
			attemptStartedAt: 1_779_000_000,
		});
		const signature = (init?.headers as Record<string, string>)["x-checkout-bridge-signature"];
		expect(signature).toBe(
			signCheckoutBridgeBody({
				bodyText: rawBody,
				secret: "test-checkout-bridge-secret",
				timestamp: 1_779_000_001,
			}),
		);
		expect(
			signCheckoutBridgeBody({
				bodyText: `${rawBody} `,
				secret: "test-checkout-bridge-secret",
				timestamp: 1_779_000_001,
			}),
		).not.toBe(signature);
	});
});
