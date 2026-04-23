import { convexClient } from "@convex-dev/better-auth/client/plugins";
import { createAuthClient } from "better-auth/svelte";
import { browser } from "$app/environment";

/**
 * Lazy, browser-only Better Auth client.
 *
 * Audit H26: the previous version read `window.location.origin` at module
 * init (outside any `if (browser)` guard), which threw during SSR on any
 * page that imported this file. Now `authClient` is a Proxy that only
 * resolves the real client on first access — and only in the browser.
 * Importing this module on the server is a no-op; any attempt to use it
 * from a `+page.server.ts` or `+layout.server.ts` throws immediately
 * instead of silently crashing SSR.
 */
type AuthClient = ReturnType<typeof createAuthClient>;

let _client: AuthClient | null = null;

function resolveClient(): AuthClient {
	if (!browser) {
		throw new Error(
			"authClient cannot be used on the server. Use `$lib/server/adminAuth.ts` for server-side session validation.",
		);
	}
	if (!_client) {
		_client = createAuthClient({
			baseURL: window.location.origin,
			plugins: [convexClient()],
		});
	}
	return _client;
}

// Proxy shim so call sites (e.g. `authClient.signIn.social(...)`) work
// without awaiting resolution. Every property access flows through
// `resolveClient()`.
export const authClient = new Proxy({} as AuthClient, {
	get(_target, prop, receiver) {
		return Reflect.get(resolveClient(), prop, receiver);
	},
});
