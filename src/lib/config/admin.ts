import type { AdminAPI, AdminConfig } from "@jessepomeroy/admin";
import { api } from "$convex/api";
import { aboutPageSeed } from "$lib/content/aboutPageSeed";
import { contactPageSeed } from "$lib/content/contactPageSeed";
import { homepageQuoteSeed } from "$lib/content/homepageQuoteSeed";
import { modelingPageSeed } from "$lib/content/modelingPageSeed";

// Map Convex `galleries` namespace to the admin package's `galleryDelivery` key.
// Map Convex `content` namespace to the admin package's `siteEditor` key.
// Map public portfolio authoring separately from private delivery galleries.
// Use a Proxy — never spread `api` (it's a Proxy with no own enumerable props).
//
// `AdminAPI` enumerates every namespace a full-tier admin can use, including
// `inquiries`. The generated shared package surface consumed here does not yet
// expose a typed inquiry namespace for this host. Convex's `anyApi` Proxy can
// resolve it dynamically, but invoking an absent function would still fail.
// Keep the cast localized until the shared package and this loader use the
// inquiry API directly.
const portfolioEditorApi = new Proxy(api.portfolioGalleries, {
	get(portfolio, prop, receiver) {
		if (prop === "listMediaAssets") return api.mediaAssets.listForEditor;
		if (prop === "getPlacedMediaAssets") return api.mediaAssets.getManyForEditor;
		if (prop === "registerReadyWebAsset") return api.mediaAssets.registerReadyWebAsset;
		return Reflect.get(portfolio, prop, receiver);
	},
});

const siteEditorApi = new Proxy(api.content, {
	get(content, prop, receiver) {
		if (prop === "listMediaAssets") return api.mediaAssets.listForEditor;
		if (prop === "getPlacedMediaAssets") return api.mediaAssets.getManyForEditor;
		return Reflect.get(content, prop, receiver);
	},
});

const apiWithAliases = new Proxy(api, {
	get(target, prop, receiver) {
		if (prop === "siteEditor") return siteEditorApi;
		if (prop === "portfolioEditor") return portfolioEditorApi;
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
		siteSettings: {},
		homepageQuote: {
			initialPayload: homepageQuoteSeed,
			previewEndpoint: "/api/admin/preview/homepage-quote",
		},
		contactPage: {
			initialPayload: contactPageSeed,
			previewEndpoint: "/api/admin/preview/contact",
		},
		aboutPage: {
			initialPayload: aboutPageSeed,
			mediaBaseUrl: "https://media.angelsrest.online",
			uploadEndpoint: "/api/admin/media",
			previewEndpoint: "/api/admin/preview/about",
		},
		modelingPage: {
			initialPayload: modelingPageSeed,
			mediaBaseUrl: "https://media.angelsrest.online",
			uploadEndpoint: "/api/admin/media",
			previewEndpoint: "/api/admin/preview/modeling",
		},
		portfolio: {
			mediaBaseUrl: "https://media.angelsrest.online",
			uploadEndpoint: "/api/admin/media",
			previewEndpoint: "/api/admin/preview/portfolio",
		},
	},
};
