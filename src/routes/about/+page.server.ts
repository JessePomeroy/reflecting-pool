import type { PageServerLoad } from "./$types";

export const prerender = true;

export interface AboutData {
	heading: string;
	portrait: string;
	bio: string;
	artistStatement: string;
	highlights: { label: string; value: string }[];
	socialLinks: { platform: string; url: string }[];
	seo: {
		description: string;
		ogImage: string;
	};
}

export const load: PageServerLoad = async () => {
	// TODO: Replace with Sanity query when project is configured:
	// const [about, settings] = await Promise.all([
	//   sanityClient.fetch(`*[_type == "aboutPage"][0] { heading, portrait { asset-> { url } }, bio, artistStatement, highlights }`),
	//   sanityClient.fetch(`*[_type == "siteSettings"][0] { socialLinks, seo }`)
	// ]);

	const data: AboutData = {
		heading: "about",
		portrait: "/images/flower-01.jpg",
		bio: `margaret helena is a photographer based in the midwest, drawn to the quiet and overlooked — the wildflower at the roadside, the petal catching afternoon light, the garden just before rain. her work lives in that liminal space between document and dream.

she works primarily with natural light and film, favoring intimacy over spectacle. each image is an invitation to slow down.`,
		artistStatement: `photography, for me, is a practice of attention. i return to flowers again and again because they insist on their own fragility — they are always in the process of becoming, or fading, or both at once. to photograph them is to hold still for a moment in a world that rarely does.

i am interested in beauty that is earned, not performed. in the particular rather than the general. in what the light does when it thinks no one is watching.`,
		highlights: [
			{ label: "based in", value: "chicago, illinois" },
			{ label: "medium", value: "film · digital" },
			{ label: "available for", value: "portrait sessions · editorial · botanical" },
			{ label: "prints", value: "archival fine art on museum-quality paper" },
		],
		socialLinks: [{ platform: "instagram", url: "https://instagram.com/margarethelena" }],
		seo: {
			description:
				"margaret helena — photographer based in chicago. fine art floral photography, portrait sessions, and archival prints.",
			ogImage: "/images/flower-03.jpg",
		},
	};

	return { about: data };
};
