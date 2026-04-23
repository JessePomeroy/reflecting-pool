/**
 * Singleton `ConvexHttpClient` for server-side webhook/action code.
 *
 * Used by the Stripe + LumaPrints webhooks (which need to write to Convex
 * without a browser socket). Matches the `getConvex()` helper in angelsrest —
 * when admin mutations were ported over, we kept a separate per-request
 * client in `src/routes/api/admin/mutation/+server.ts` because `setAuth`
 * mutates client state and a shared singleton would leak tokens between
 * concurrent requests. The webhook path doesn't call `setAuth` (it passes
 * `webhookSecret` in the mutation args instead), so the singleton is safe.
 */

import { ConvexHttpClient } from "convex/browser";
import { env as publicEnv } from "$env/dynamic/public";

let _client: ConvexHttpClient | null = null;

export function getConvex(): ConvexHttpClient {
	if (!_client) {
		const url = publicEnv.PUBLIC_CONVEX_URL;
		if (!url) {
			throw new Error("PUBLIC_CONVEX_URL is not set — cannot initialize Convex HTTP client.");
		}
		_client = new ConvexHttpClient(url);
	}
	return _client;
}
