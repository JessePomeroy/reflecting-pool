import type { PageServerLoad } from "./$types";

export const prerender = true;

export interface AboutData {
	heading: string;
	portrait: string;
	bio: string;
	artistStatement: string;
	sections: { title: string; items: string[] }[];
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
		bio: `Margaret Helena / Maggie Mac / zippymiggy

Chicago-raised creative working across documentation, direction, music, and performance.`,
		artistStatement: `Building In Between — a space for artists to gather where image, sound, and memory meet.`,
		sections: [
			{
				title: "background",
				items: [
					"Chicago-raised creative working across documentation, direction, music, and performance",
					"BA in Journalism + minor in Media Art, University of Wisconsin-Whitewater",
					"Former volleyball setter — a role that continues to shape how I approach collaboration, timing, and visual awareness",
				],
			},
			{
				title: "experience",
				items: [
					"Off the Record Press — concert photography",
					"Steven Piper — commercial photography internship",
					"Maggie Mac LLC — freelance photography and videography",
					"SGK Inc. + Chicago-based photographers — freelance photo/production assistant",
					"Heaven Gallery (Wicker Park) — gallery intern",
				],
			},
			{
				title: "practice",
				items: ["Photography, direction, and music", "Modeling, acting, and singing"],
			},
			{
				title: "current",
				items: [
					"Building In Between — a space for artists to gather where image, sound, and memory meet",
				],
			},
		],

		highlights: [
			{ label: "based in", value: "chicago, illinois" },
			{ label: "practice", value: "photography · direction · music" },
			{ label: "performance", value: "modeling · acting · singing" },
			{ label: "available for", value: "photo · video · production support" },
		],
		socialLinks: [{ platform: "instagram", url: "https://instagram.com/margarethelena" }],
		seo: {
			description:
				"margaret helena — chicago-raised creative working across photography, direction, music, modeling, acting, and performance.",
			ogImage: "/images/flower-03.jpg",
		},
	};

	return { about: data };
};
