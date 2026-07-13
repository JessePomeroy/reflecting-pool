const GALLERY_WORKER_ORIGIN = "https://gallery-worker.thinkingofview.workers.dev";

/**
 * Browser resource policy for Reflecting Pool HTML responses.
 *
 * SvelteKit augments script-src with a nonce for dynamic pages and hashes for
 * prerendered pages. Keep deployment-wide response headers in vercel.json;
 * keeping the resource allowlist here lets SvelteKit protect its own bootstrap
 * without permitting arbitrary inline scripts.
 *
 * @type {NonNullable<NonNullable<NonNullable<import("@sveltejs/kit").Config["kit"]>["csp"]>["directives"]>}
 */
export const contentSecurityPolicy = {
	"default-src": ["self"],
	"base-uri": ["none"],
	"object-src": ["none"],
	// Ignored in prerendered CSP meta elements; vercel.json enforces it there.
	"frame-ancestors": ["none"],
	"script-src": ["self", "https://challenges.cloudflare.com", "https://app.cal.com"],
	"script-src-attr": ["none"],
	"style-src": ["self", "unsafe-inline", "https://fonts.googleapis.com"],
	"font-src": ["self", "https://fonts.gstatic.com"],
	"img-src": ["self", "data:", "blob:", "https://cdn.sanity.io", GALLERY_WORKER_ORIGIN],
	"media-src": ["self"],
	"connect-src": [
		"self",
		"https://fonts.googleapis.com",
		"https://fonts.gstatic.com",
		"https://*.convex.cloud",
		"wss://*.convex.cloud",
		"https://*.sentry.io",
		GALLERY_WORKER_ORIGIN,
	],
	"frame-src": ["https://challenges.cloudflare.com", "https://cal.com", "https://app.cal.com"],
	"form-action": ["self", GALLERY_WORKER_ORIGIN],
};
