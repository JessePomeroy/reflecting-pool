import type { AdminServerConfig } from "@jessepomeroy/admin";
import { api } from "$convex/api";
import { env as privateEnv } from "$env/dynamic/private";
import { env as publicEnv } from "$env/dynamic/public";
import { adminConfig } from "./admin";

export const adminServerConfig: AdminServerConfig = {
	...adminConfig,
	convexUrl: publicEnv.PUBLIC_CONVEX_URL ?? "",
	resendApiKey: privateEnv.RESEND_API_KEY ?? "",
};
