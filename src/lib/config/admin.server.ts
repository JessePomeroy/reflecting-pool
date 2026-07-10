import type { AdminServerConfig } from "@jessepomeroy/admin/server";
import { env as privateEnv } from "$env/dynamic/private";
import { env as publicEnv } from "$env/dynamic/public";
import { adminAuth } from "$lib/server/adminAuth";
import { getGalleryWorkerUrl } from "$lib/server/galleryWorkerUrl";
import { verifySiteAdminRequest } from "$lib/server/siteAdminAuthorization";
import { adminConfig } from "./admin";

export const adminServerConfig: AdminServerConfig = {
	...adminConfig,
	convexUrl: publicEnv.PUBLIC_CONVEX_URL ?? "",
	resendApiKey: privateEnv.RESEND_API_KEY ?? "",
	galleryWorkerUrl: getGalleryWorkerUrl(),
	galleryAdminSecret: privateEnv.GALLERY_ADMIN_SECRET ?? "",
	verifyAdmin: verifySiteAdminRequest,
	getConvexToken: adminAuth.getTokenFromRequest,
};
