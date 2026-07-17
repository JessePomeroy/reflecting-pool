// Server-only Sanity content facade. Orders and other operational data live in
// shared Convex; this module exports only CMS reads and typed fallbacks.

import { fetchSanityOrFallback, hasSanityConfig, sanityClient } from "$lib/server/sanityClient";

export type { AboutContent } from "$lib/server/content/about";
export { fetchAboutContent } from "$lib/server/content/aboutPageProvider";
export type { HomepageContent } from "$lib/server/content/homepage";
export { fetchHomepageContent } from "$lib/server/content/homepageQuoteProvider";
export type {
	ModelingGallery,
	ModelingImage,
	ModelingPageContent,
} from "$lib/server/content/modeling";
export { fetchModelingPageContent } from "$lib/server/content/modelingPageProvider";
export {
	fetchCollections,
	fetchCollectionWithPrints,
	fetchPrintableProducts,
	fetchPrintProduct,
	getFallbackCollectionWithPrints,
	getFallbackPrintCollections,
	getFallbackPrintProducts,
} from "$lib/server/content/shopCatalog";
export {
	type ContactSettingsContent,
	fetchLegacySiteSettings,
	getFallbackSiteSettings,
	normalizeSiteSettings,
	type SiteSettingsContent,
	type SiteSettingsResult,
} from "$lib/server/content/siteSettings";
export { fetchSiteSettings } from "$lib/server/content/siteSettingsProvider";
export { fetchSanityOrFallback, hasSanityConfig, sanityClient };
