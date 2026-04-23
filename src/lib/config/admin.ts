import type { AdminAPI, AdminConfig } from "@jessepomeroy/admin";
import { api } from "$convex/api";

// Map Convex `galleries` namespace to the admin package's `galleryDelivery` key.
// Use a Proxy — never spread `api` (it's a Proxy with no own enumerable props).
//
// `AdminAPI` (from the admin package) enumerates every namespace a full-tier
// admin can use, including `inquiries`. Reflecting-pool has no Convex
// `inquiries` module — inquiries are (currently) Sanity-mocked — so
// `typeof api` omits that key. The underlying `api` Proxy DOES return a
// live reference for any property access at runtime (that's how `anyApi`
// works), so the cast below is sound at the call sites that actually use
// it; any missing module would throw at invocation time, not at access.
// Cast through `unknown` to satisfy the AdminAPI shape without falsely
// claiming we ship those modules. See audit H42 on un-mocking Sanity — at
// that point, port angelsrest's `convex/inquiries.ts` and drop this cast.
const apiWithAliases = new Proxy(api, {
	get(target, prop, receiver) {
		if (prop === "galleryDelivery") return target.galleries;
		return Reflect.get(target, prop, receiver);
	},
}) as unknown as AdminAPI;

export const adminConfig: AdminConfig = {
	// Bare domain, no scheme, no www. Must match `platformClients.siteUrl`
	// on the Convex side exactly (case-sensitive). Any change here also needs
	// `npx convex run platform:ensureSiteAdmin '{"siteUrl":"zippymiggy.com",…}'`
	// run against both dev + prod deployments.
	siteUrl: "zippymiggy.com",
	siteName: "reflecting pool",
	fromEmail: "Reflecting Pool <noreply@zippymiggy.com>",
	isCreator: false,
	api: apiWithAliases,
	galleryWorkerUrl: "https://gallery-worker.thinkingofview.workers.dev",
	// Route mutations through the SvelteKit proxy at /api/admin/mutation
	// instead of the Convex WebSocket. The browser socket is intentionally
	// unauthenticated (see admin/+layout.svelte) to avoid the pause bug in
	// `@mmailaender/convex-better-auth-svelte@0.7.3` + `better-auth@1.5.x`
	// during SvelteKit client-side navigation.
	mutationTransport: "http",
};
