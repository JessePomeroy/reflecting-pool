import { dev } from "$app/environment";
import { PUBLIC_SITE_URL } from "$env/static/public";

const DEFAULT_SITE_URL = "https://margarethelena.com";

function normalizeSiteUrl(value: string | undefined) {
	const trimmed = value?.trim();
	if (!trimmed) return DEFAULT_SITE_URL;
	return trimmed.replace(/\/+$/, "") || DEFAULT_SITE_URL;
}

export const SITE_URL = dev ? normalizeSiteUrl(PUBLIC_SITE_URL) : DEFAULT_SITE_URL;
export const SITEMAP_URL = `${SITE_URL}/sitemap.xml`;

export function siteUrlForPath(pathname: string) {
	if (pathname === "/") return `${SITE_URL}/`;
	const normalizedPath = `/${pathname.replace(/^\/+/, "").replace(/\/+$/, "")}`;
	return `${SITE_URL}${normalizedPath}`;
}
