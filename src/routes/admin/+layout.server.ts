import { requireAdmin } from "$lib/server/auth";
import type { LayoutServerLoad } from "./$types";

export const load: LayoutServerLoad = async (event) => {
	// Admin login route is public so the user can authenticate.
	if (event.url.pathname === "/admin/login") return {};
	requireAdmin(event);
	return {};
};
