// Shared Sanity client utilities for server-side content loaders.

import { createClient } from "@sanity/client";
import { env } from "$env/dynamic/private";
import { env as publicEnv } from "$env/dynamic/public";

// Per-client Sanity tenancy is currently undecided (platform-owned vs
// client-owned, see angelsrest CLAUDE.md). Until a tenant's project is
// provisioned, Vercel won't have these vars set; using $env/dynamic/private
// defers the missing-secret failure from build to request time so the rest
// of the site can deploy. Sanity-backed content routes fall back until real
// values are pushed.
//
// Lazy-init is required: the @sanity/client constructor throws
// "Configuration must contain `projectId`" if projectId is undefined,
// which would crash SvelteKit's prerender step at build time.
let _sanityClient: ReturnType<typeof createClient> | null = null;
const sanityProjectId = env.SANITY_PROJECT_ID || publicEnv.PUBLIC_SANITY_PROJECT_ID;
const sanityDataset = env.SANITY_DATASET || publicEnv.PUBLIC_SANITY_DATASET;

export function sanityClient() {
	if (!_sanityClient) {
		_sanityClient = createClient({
			projectId: sanityProjectId,
			dataset: sanityDataset,
			token: env.SANITY_API_READ_TOKEN || undefined,
			apiVersion: "2024-01-01",
			// CDN on — gallery reads are public and tolerate the short stale window.
			useCdn: true,
		});
	}
	return _sanityClient;
}

export function hasSanityConfig() {
	return Boolean(sanityProjectId && sanityDataset);
}

export async function fetchSanityOrFallback<T>(
	query: string,
	fallback: T,
	params?: Record<string, unknown>,
) {
	if (!hasSanityConfig()) return fallback;

	try {
		const result = await sanityClient().fetch<T | null>(query, params ?? {});
		return result ?? fallback;
	} catch (err) {
		console.error("[sanity] Falling back after fetch failed:", err);
		return fallback;
	}
}
