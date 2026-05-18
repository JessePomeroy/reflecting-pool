import { fetchAboutContent } from "$lib/server/content/about";
import { fetchSiteSettings } from "$lib/server/content/siteSettings";
import type { PageServerLoad } from "./$types";

export const prerender = true;

export const load: PageServerLoad = async () => {
	const [about, settings] = await Promise.all([fetchAboutContent(), fetchSiteSettings()]);
	return { about, settings };
};
