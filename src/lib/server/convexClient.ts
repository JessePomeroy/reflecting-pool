/**
 * Singleton `ConvexHttpClient` for public server-side content and catalog queries.
 *
 * These reads do not call `setAuth`, so sharing this client cannot leak tokens
 * between requests. Admin mutations use a separate per-request authenticated
 * client in `src/routes/api/admin/mutation/+server.ts`. Shipment processing and
 * webhook-secret authority belong to the Angels Rest hub, not this spoke.
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
