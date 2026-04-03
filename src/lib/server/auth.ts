import type { RequestEvent } from "@sveltejs/kit";
import { redirect } from "@sveltejs/kit";

const ADMIN_COOKIE_NAME = "rp_admin_session";

// TODO: Replace with real auth (OAuth, magic link, etc.)
// For now, this checks for a simple session cookie
// Set the cookie manually or via a login endpoint

export function requireAdmin(event: RequestEvent): void {
	const session = event.cookies.get(ADMIN_COOKIE_NAME);

	if (!session) {
		// TODO: Uncomment when ready to enforce auth
		// throw redirect(302, '/admin/login');
	}
}

export function isAdmin(event: RequestEvent): boolean {
	return !!event.cookies.get(ADMIN_COOKIE_NAME);
}
