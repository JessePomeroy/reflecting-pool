import type { RequestHandler } from "./$types";

// TODO: When Sanity is connected, fetch all gallery slugs and collection slugs dynamically
const SITE_URL = "https://reflectingpool.com";

export const GET: RequestHandler = async () => {
	const pages = [
		{ url: "/", priority: "1.0", changefreq: "weekly" },
		{ url: "/about", priority: "0.8", changefreq: "monthly" },
		{ url: "/shop", priority: "0.9", changefreq: "weekly" },
		// TODO: Add dynamic collection and print URLs from Sanity
	];

	const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${pages
	.map(
		(p) => `  <url>
    <loc>${SITE_URL}${p.url}</loc>
    <changefreq>${p.changefreq}</changefreq>
    <priority>${p.priority}</priority>
  </url>`,
	)
	.join("\n")}
</urlset>`;

	return new Response(xml, {
		headers: {
			"Content-Type": "application/xml",
			"Cache-Control": "max-age=3600",
		},
	});
};
