import { env } from "$env/dynamic/private";
import type { CheckoutSnapshotItem } from "$lib/server/checkoutCatalogResolver";
import { CheckoutValidationError } from "$lib/server/checkoutError";

const PATH = "/commerce/catalog/checkout/resolve";
type ResolverConfig = { endpoint?: string; credential?: string; fetcher?: typeof fetch };
function failed(): never {
	throw new CheckoutValidationError(503, "Selected print is unavailable");
}
function endpoint(raw: string | undefined) {
	if (!raw) failed();
	try {
		const url = new URL(raw);
		if (url.protocol !== "https:" || url.username || url.password) failed();
		if (url.pathname !== PATH || url.search || url.hash || url.href !== raw) failed();
		return raw;
	} catch {
		failed();
	}
}
async function boundedJson(response: Response) {
	if (response.headers.get("content-type") !== "application/json") failed();
	const length = response.headers.get("content-length");
	if (length !== null && (!/^\d+$/.test(length) || Number(length) > 64 * 1024)) failed();
	const reader = response.body?.getReader();
	if (!reader) failed();
	const chunks: Uint8Array[] = [];
	let total = 0;
	while (true) {
		const chunk = await reader.read();
		if (chunk.done) break;
		total += chunk.value.byteLength;
		if (total > 64 * 1024) {
			await reader.cancel();
			failed();
		}
		chunks.push(chunk.value);
	}
	if (length !== null && Number(length) !== total) failed();
	try {
		const text = new TextDecoder("utf-8", { fatal: true }).decode(Buffer.concat(chunks, total));
		return JSON.parse(text) as unknown;
	} catch {
		failed();
	}
}
export async function resolvePrivateCheckout(
	item: CheckoutSnapshotItem,
	config: ResolverConfig = {
		endpoint: env.CATALOG_COMMERCE_CHECKOUT_RESOLVER_ENDPOINT,
		credential: env.CATALOG_COMMERCE_CHECKOUT_RESOLVER_CREDENTIAL,
	},
) {
	if (!config.credential || !/^[A-Za-z0-9._~+/-]{32,512}$/.test(config.credential)) failed();
	const body = JSON.stringify({ version: 1, item });
	if (new TextEncoder().encode(body).byteLength > 4096) failed();
	const response = await (config.fetcher ?? fetch)(endpoint(config.endpoint), {
		method: "POST",
		headers: { authorization: `Bearer ${config.credential}`, "content-type": "application/json" },
		body,
		signal: AbortSignal.timeout(5_000),
	}).catch(() => failed());
	if (!response.ok) failed();
	return boundedJson(response).catch(() => failed());
}
