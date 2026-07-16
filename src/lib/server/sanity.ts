// Server-only Sanity content facade. Orders and other operational data live in
// shared Convex; this module exports only CMS reads and typed fallbacks.

import { fetchSanityOrFallback, hasSanityConfig, sanityClient } from "$lib/server/sanityClient";

export { type AboutContent, fetchAboutContent } from "$lib/server/content/about";
export type { HomepageContent } from "$lib/server/content/homepage";
export { fetchHomepageContent } from "$lib/server/content/homepageQuoteProvider";
export {
	fetchModelingPageContent,
	type ModelingGallery,
	type ModelingImage,
	type ModelingPageContent,
} from "$lib/server/content/modeling";
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
