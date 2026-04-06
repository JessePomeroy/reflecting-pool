/**
 * Auth.js configuration — Google OAuth with an allowlist.
 *
 * Required env vars:
 *   AUTH_SECRET         — signing secret for session JWT (generate with `openssl rand -base64 32`)
 *   AUTH_GOOGLE_ID      — OAuth client ID from Google Cloud Console
 *   AUTH_GOOGLE_SECRET  — OAuth client secret
 *   ADMIN_EMAIL         — comma-separated list of Google emails permitted to sign in
 *
 * Callback URL to register with Google: https://<your-domain>/auth/callback/google
 * (For dev: http://localhost:5173/auth/callback/google)
 */
import { SvelteKitAuth } from "@auth/sveltekit";
import Google from "@auth/sveltekit/providers/google";
import { env } from "$env/dynamic/private";

/** Comma-separated allowlist of admin emails from env. */
function getAllowedEmails(): Set<string> {
	return new Set(
		(env.ADMIN_EMAIL ?? "")
			.split(",")
			.map((s) => s.trim().toLowerCase())
			.filter(Boolean),
	);
}

export const { handle, signIn, signOut } = SvelteKitAuth({
	trustHost: true,
	providers: [Google],
	callbacks: {
		async signIn({ profile }) {
			// Only admins on the allowlist are permitted to sign in at all —
			// reject everyone else at the OAuth callback.
			const email = profile?.email?.toLowerCase();
			if (!email) return false;
			const allowed = getAllowedEmails();
			if (allowed.size === 0) return false; // fail closed
			return allowed.has(email);
		},
		async session({ session }) {
			// Attach `isAdmin` to session so server code can check cheaply.
			const email = session.user?.email?.toLowerCase();
			const allowed = getAllowedEmails();
			(session as typeof session & { isAdmin: boolean }).isAdmin = !!email && allowed.has(email);
			return session;
		},
	},
	pages: {
		signIn: "/admin/login",
	},
});
