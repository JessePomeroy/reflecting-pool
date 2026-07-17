import {
	type AboutPageReadTelemetry,
	fetchAboutContent,
} from "$lib/server/content/aboutPageProvider";
import type { ContactPageReadTelemetry } from "$lib/server/content/contactPageProvider";
import { type CmsReadTelemetry, fetchSiteSettings } from "$lib/server/content/siteSettingsProvider";
import type { PageServerLoad } from "./$types";

export const prerender = false;

export const load: PageServerLoad = async () => {
	const entries: Array<AboutPageReadTelemetry | CmsReadTelemetry | ContactPageReadTelemetry> = [];
	try {
		const [about, settings] = await Promise.all([
			fetchAboutContent({ log: (entry) => entries.push(entry) }),
			fetchSiteSettings((entry) => entries.push(entry)),
		]);
		return { about, settings };
	} finally {
		console.info("[cms]", entries);
	}
};
