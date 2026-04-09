import type { AdminConfig } from "@jessepomeroy/admin";
import { api } from "$convex/api";

export const adminConfig: AdminConfig = {
	siteUrl: "reflecting-pool.com",
	siteName: "reflecting pool",
	fromEmail: "Reflecting Pool <noreply@reflecting-pool.com>",
	isCreator: false,
	api,
};
