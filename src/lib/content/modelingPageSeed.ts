import type { ModelingPageDraftPayload } from "@jessepomeroy/admin";

/**
 * Current host-owned Modeling copy and category structure for CMS setup.
 *
 * Static fallback images intentionally are not represented as CMS media IDs.
 * Categories begin hidden and empty so the first draft cannot accidentally
 * replace the public fallback before real images are uploaded or reused.
 */
export const modelingPageSeed: ModelingPageDraftPayload = {
	heading: "digital headshots",
	intro: "placeholder selects for maggie's modeling, acting, and portrait work.",
	galleries: [
		{
			key: "fashion-editorial",
			title: "Fashion Editorial",
			slug: "fashion-editorial",
			isVisible: false,
			images: [],
		},
		{
			key: "comp-card-digitals",
			title: "Comp Card Digitals",
			slug: "comp-card-digitals",
			isVisible: false,
			images: [],
		},
		{
			key: "commercial",
			title: "Commercial",
			slug: "commercial",
			isVisible: false,
			images: [],
		},
	],
	seoDescription: "Digital headshots and modeling portfolio for Margaret Helena.",
};
