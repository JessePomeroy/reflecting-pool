import type { AdminAPI, AdminConfig } from "@jessepomeroy/admin";
import { api } from "$convex/api";

// Map Convex `galleries` namespace to the admin package's `galleryDelivery` key.
// Map Convex `content` namespace to the admin package's `siteEditor` key.
// Use a Proxy — never spread `api` (it's a Proxy with no own enumerable props).
//
// `AdminAPI` enumerates every namespace a full-tier admin can use, including
// `inquiries`. The generated shared package surface consumed here does not yet
// expose a typed inquiry namespace for this host. Convex's `anyApi` Proxy can
// resolve it dynamically, but invoking an absent function would still fail.
// Keep the cast localized until the shared package and this loader use the
// inquiry API directly.
const apiWithAliases = new Proxy(api, {
	get(target, prop, receiver) {
		if (prop === "siteEditor") return target.content;
		if (prop === "galleryDelivery") {
			return new Proxy(target.galleries, {
				get(galleries, galleryProp, galleryReceiver) {
					if (galleryProp === "setPassword") return target.galleryPassword.setPassword;
					return Reflect.get(galleries, galleryProp, galleryReceiver);
				},
			});
		}
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
	authCallbackURL: "/admin",
	galleryWorkerUrl: "https://gallery-worker.thinkingofview.workers.dev",
	boardProjectTypes: [
		{ label: "photography", values: ["wedding", "portrait", "family", "commercial", "event"] },
	],
	// Route mutations through the SvelteKit proxy at /api/admin/mutation.
	// Queries use the manually authenticated WebSocket; HTTP mutations receive a
	// fresh authenticated Convex client independent of socket navigation state.
	mutationTransport: "http",
	editor: {
		// Preview remains disabled until CMS-1.4 gives the public site an explicit
		// Convex provider switch. Linking to `/` here would only show Sanity data.
		siteSettings: {},
	},
};
