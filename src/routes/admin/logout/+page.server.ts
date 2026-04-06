import { redirect } from "@sveltejs/kit";
import { signOut } from "../../../auth";
import type { Actions, PageServerLoad } from "./$types";

export const load: PageServerLoad = async () => {
	// No GET view — redirect to the login page.
	throw redirect(302, "/admin/login");
};

// Auth.js ships a `signOut` server action — it clears the session cookie
// and redirects to `/` unless a `redirectTo` form field is provided.
export const actions: Actions = { default: signOut };
