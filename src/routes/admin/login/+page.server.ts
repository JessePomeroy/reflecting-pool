import { redirect } from "@sveltejs/kit";
import { signIn } from "../../../auth";
import type { Actions, PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ locals, url }) => {
	// Already authenticated? Bounce to the requested target (or dashboard).
	if (locals.user?.isAdmin) {
		const next = url.searchParams.get("next") || "/admin";
		throw redirect(302, next);
	}
	return {
		error: url.searchParams.get("error"),
		next: url.searchParams.get("next") ?? "/admin",
	};
};

// Auth.js ships a `signIn` server action — wire it to the form below.
export const actions: Actions = { default: signIn };
