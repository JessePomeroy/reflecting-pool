import { SITE_URL } from "$lib/config/site";
import { fetchCollections, fetchPrintableProducts } from "$lib/server/content/shopCatalog";
import type { RequestHandler } from "./$types";

interface SitemapPage {
	url: string;
	priority: string;
	changefreq: string;
}

function escapeXml(value: string) {
	return value
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&apos;");
}

function uniquePages(pages: SitemapPage[]) {
	const seen = new Set<string>();
	return pages.filter((page) => {
		if (seen.has(page.url)) return false;
		seen.add(page.url);
		return true;
	});
}

export const GET: RequestHandler = async () => {
	const dynamicPages: SitemapPage[] = [];

	const [collectionsResult, productsResult] = await Promise.allSettled([
		fetchCollections(),
		fetchPrintableProducts(),
	]);

	if (collectionsResult.status === "fulfilled") {
		dynamicPages.push(
			...collectionsResult.value.map((collection) => ({
				url: `/shop/collection/${collection.slug}`,
				priority: "0.7",
				changefreq: "weekly",
			})),
		);
	} else {
		console.warn("[sitemap] failed to load collection URLs", collectionsResult.reason);
	}

	if (productsResult.status === "fulfilled") {
		dynamicPages.push(
			...productsResult.value.map((product) => ({
				url: `/shop/${product.slug}`,
				priority: "0.6",
				changefreq: "monthly",
			})),
		);
	} else {
		console.warn("[sitemap] failed to load product URLs", productsResult.reason);
	}

	const pages = uniquePages([
		{ url: "/", priority: "1.0", changefreq: "weekly" },
		{ url: "/about", priority: "0.8", changefreq: "monthly" },
		{ url: "/shop", priority: "0.9", changefreq: "weekly" },
		...dynamicPages,
	]);

	const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${pages
	.map(
		(p) => `  <url>
    <loc>${escapeXml(`${SITE_URL}${p.url}`)}</loc>
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
