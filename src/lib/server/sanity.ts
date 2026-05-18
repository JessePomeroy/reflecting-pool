// Sanity client — server-only, CMS-only.
//
// Scope (audit H42a): this module handles only gallery/print CMS reads.
// Orders do NOT live in Sanity — the Stripe + LumaPrints webhooks write
// to Convex via `@jessepomeroy/crm-api` (see
// `src/routes/api/webhooks/stripe/+server.ts`). See CLAUDE.md §"Key
// architectural facts" #1 for the split.
//
// TODO (H42a): Replace mock print/shop data with real Sanity queries once
// Maggie's print catalog is fully represented in Studio.

import { fetchSanityOrFallback, hasSanityConfig, sanityClient } from "$lib/server/sanityClient";

export { type AboutContent, fetchAboutContent } from "$lib/server/content/about";
export { fetchHomepageContent, type HomepageContent } from "$lib/server/content/homepage";
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
	fetchSiteSettings,
	getFallbackSiteSettings,
	normalizeSiteSettings,
	type SiteSettingsContent,
	type SiteSettingsResult,
} from "$lib/server/content/siteSettings";
export { fetchSanityOrFallback, hasSanityConfig, sanityClient };

// Order-related functions (`createSanityOrder`, `updateSanityOrder`,
// `findOrderByLumaprintsNumber`, `findOrderByStripeSessionId`) used to
// live here. They were removed on the H42b Sanity → Convex migration
// (2026-04-23). Orders now live in Convex; the webhook handlers call
// `api.orders.create` / `api.orders.updateStatus` /
// `api.orders.getByLumaprintsOrderNumber` via `@jessepomeroy/crm-api`.
