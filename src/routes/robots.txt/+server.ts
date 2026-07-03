import { SITEMAP_URL } from "$lib/config/site";
import type { RequestHandler } from "./$types";

export const GET: RequestHandler = async () => {
	return new Response(
		`User-agent: *
Allow: /
Disallow: /admin
Disallow: /api

Sitemap: ${SITEMAP_URL}
`,
		{
			headers: {
				"Content-Type": "text/plain; charset=utf-8",
				"Cache-Control": "max-age=3600",
			},
		},
	);
};
