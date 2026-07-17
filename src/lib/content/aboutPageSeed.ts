import type { AboutPageDraftPayload } from "@jessepomeroy/admin";

/**
 * Current host-owned About copy for reversible CMS setup.
 *
 * Static fallback images intentionally are not represented as CMS media IDs.
 * The first draft therefore remains unpublished until the editor uploads or
 * reuses at least one ready portrait.
 */
export const aboutPageSeed: AboutPageDraftPayload = {
	heading: "about",
	displayName: "margaret helena / maggie mac / zippymiggy",
	sections: [
		{
			key: "background",
			title: "background",
			items: [
				"Chicago-raised creative working across documentation, direction, music, and performance",
				"BA in Journalism + minor in Media Art, University of Wisconsin-Whitewater",
				"Former volleyball setter — a role that continues to shape how I approach collaboration, timing, and visual awareness",
			],
		},
		{
			key: "experience",
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
			key: "practice",
			title: "practice",
			items: ["Photography, direction, and music", "Modeling, acting, and singing"],
		},
		{
			key: "current",
			title: "current",
			items: [
				"Building In Between — a space for artists to gather where image, sound, and memory meet",
			],
		},
	],
	highlights: [
		{ key: "based-in", label: "based in", value: "chicago, illinois" },
		{ key: "practice", label: "practice", value: "photography · direction · music" },
		{ key: "performance", label: "performance", value: "modeling · acting · singing" },
		{ key: "available-for", label: "available for", value: "photo · video · production support" },
	],
	portraits: [],
	seoDescription:
		"margaret helena — chicago-raised creative working across photography, direction, music, modeling, acting, and performance.",
};
