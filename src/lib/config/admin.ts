import type { AdminConfig } from "@jessepomeroy/admin";
import { api } from "$convex/api";

// Map Convex `galleries` namespace to the admin package's `galleryDelivery` key.
// Use a Proxy — never spread `api` (it's a Proxy with no own enumerable props).
const apiWithAliases = new Proxy(api, {
	get(target, prop, receiver) {
		if (prop === "galleryDelivery") return target.galleries;
		return Reflect.get(target, prop, receiver);
	},
}) as typeof api & { galleryDelivery: typeof api.galleries };

export const adminConfig: AdminConfig = {
	siteUrl: "reflecting-pool.com",
	siteName: "reflecting pool",
	fromEmail: "Reflecting Pool <noreply@reflecting-pool.com>",
	isCreator: false,
	api: apiWithAliases,
	galleryWorkerUrl: "https://gallery-worker.thinkingofview.workers.dev",
};
