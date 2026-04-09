/**
 * SvelteKit Server Hooks
 *
 * Security headers and auth route handling.
 * Admin auth is handled client-side by Better Auth via the admin package.
 */

function addSecurityHeaders(response: Response): Response {
	const cloned = new Response(response.body, response);
	cloned.headers.set("X-Frame-Options", "DENY");
	cloned.headers.set("X-Content-Type-Options", "nosniff");
	cloned.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
	cloned.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
	return cloned;
}

export async function handle({ event, resolve }) {
	const response = await resolve(event);

	// Skip security headers for auth API routes (response is immutable)
	if (event.url.pathname.startsWith("/api/auth")) {
		return response;
	}

	return addSecurityHeaders(response);
}
