import { type AboutContent, fetchAboutContent } from "$lib/server/sanity";
import type { PageServerLoad } from "./$types";

export const prerender = true;

export type AboutData = AboutContent;

export const load: PageServerLoad = async () => {
	return { about: await fetchAboutContent() };
};
