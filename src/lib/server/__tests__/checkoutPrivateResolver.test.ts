import { describe, expect, it, vi } from "vitest";
import { resolvePrivateCheckout } from "$lib/server/checkoutPrivateResolver";

const endpoint = "https://catalog.test/commerce/catalog/checkout/resolve";
const credential = "c".repeat(32);
const item = {
	productKey: "product_123",
	revisionId: "revision_123",
	productKind: "print" as const,
	variantKey: "variant_123",
	materialOptionKey: "archival-matte",
	sizeOptionKey: "8x10",
	borderOptionKey: null,
	frameOptionKey: null,
};
function json(value: unknown, status = 200) {
	const body = JSON.stringify(value);
	return new Response(body, {
		status,
		headers: {
			"content-type": "application/json",
			"content-length": String(Buffer.byteLength(body)),
		},
	});
}

describe("checkout private resolver client", () => {
	it("posts once to the exact fixed HTTPS endpoint with a five-second deadline", async () => {
		const timeout = vi.spyOn(AbortSignal, "timeout");
		const fetcher = vi.fn(async (_input: URL | RequestInfo, _init?: RequestInit) =>
			json({ version: 1 }),
		);
		await expect(resolvePrivateCheckout(item, { endpoint, credential, fetcher })).resolves.toEqual({
			version: 1,
		});
		expect(fetcher).toHaveBeenCalledOnce();
		const [url, init] = fetcher.mock.calls[0] ?? [];
		const headers = init?.headers as Record<string, string>;
		expect(url).toBe(endpoint);
		expect(init?.method).toBe("POST");
		expect(headers["content-type"]).toBe("application/json");
		expect(headers.authorization).toMatch(/^Bearer /);
		expect(JSON.parse(String(init?.body))).toEqual({ version: 1, item });
		expect(init?.signal).toBeInstanceOf(AbortSignal);
		expect(timeout).toHaveBeenCalledWith(5_000);
		timeout.mockRestore();
	});

	it.each([
		["missing endpoint", { credential }],
		["missing credential", { endpoint }],
		["malformed credential", { endpoint, credential: "short" }],
		["HTTP endpoint", { endpoint: endpoint.replace("https:", "http:"), credential }],
		["wrong path", { endpoint: "https://catalog.test/other", credential }],
		["query string", { endpoint: `${endpoint}?private=id`, credential }],
	])("fails before fetch for %s", async (_label, config) => {
		const fetcher = vi.fn();
		await expect(resolvePrivateCheckout(item, { ...config, fetcher })).rejects.toMatchObject({
			status: 503,
			message: "Selected print is unavailable",
		});
		expect(fetcher).not.toHaveBeenCalled();
	});

	it.each([
		[
			"timeout",
			vi.fn(async () => {
				throw new DOMException("private timeout URL", "AbortError");
			}),
		],
		[
			"oversized response",
			vi.fn(
				async () =>
					new Response("{}", {
						headers: { "content-type": "application/json", "content-length": "65537" },
					}),
			),
		],
		[
			"malformed JSON",
			vi.fn(
				async () =>
					new Response("private response material", {
						headers: { "content-type": "application/json" },
					}),
			),
		],
		["resolver rejection", vi.fn(async () => json({ private: "private response material" }, 401))],
	])("fails generically without retries or private material for %s", async (_label, fetcher) => {
		const log = vi.spyOn(console, "error").mockImplementation(() => undefined);
		let failure: unknown;
		try {
			await resolvePrivateCheckout(item, { endpoint, credential, fetcher: fetcher as never });
		} catch (error) {
			failure = error;
		}
		expect(failure).toMatchObject({ status: 503, message: "Selected print is unavailable" });
		expect(String(failure)).not.toMatch(/private|catalog\.test|product_123|cccc/);
		expect(fetcher).toHaveBeenCalledOnce();
		expect(log).not.toHaveBeenCalled();
		log.mockRestore();
	});

	it("rejects an undeclared oversized stream", async () => {
		const fetcher = vi.fn(
			async () =>
				new Response(new Uint8Array(65_537), {
					headers: { "content-type": "application/json" },
				}),
		);
		await expect(
			resolvePrivateCheckout(item, { endpoint, credential, fetcher }),
		).rejects.toMatchObject({
			message: "Selected print is unavailable",
		});
		expect(fetcher).toHaveBeenCalledOnce();
	});
});
