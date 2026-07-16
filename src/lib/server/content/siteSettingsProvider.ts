import { api } from "$convex/api";
import { env } from "$env/dynamic/private";
import { adminConfig } from "$lib/config/admin";
import {
	applyContactPageProviderWithDependencies,
	type ContactPageReadTelemetry,
} from "$lib/server/content/contactPageProvider";
import {
	fetchLegacySiteSettings,
	type SiteSettingsContent,
	type SiteSettingsResult,
} from "$lib/server/content/siteSettings";
import { getConvex } from "$lib/server/convexClient";

export type SiteSettingsProviderMode = "fallback" | "shadow" | "convex";

export interface PublishedCmsSiteSettings {
	artistName: string;
	siteTitle: string;
	tagline: string;
	socialLinks: Array<{ platform: string; url: string }>;
	seoDescription: string;
}

export interface PublishedCmsSiteSettingsState {
	revisionId: string;
	publishedAt: number;
	payload: PublishedCmsSiteSettings;
}

export interface CmsReadTelemetry {
	event:
		| "cms.provider_config_invalid"
		| "cms.public_read_succeeded"
		| "cms.public_read_failed"
		| "cms.shadow_match"
		| "cms.shadow_mismatch"
		| "cms.shadow_unavailable";
	site: string;
	kind: "siteSettings";
	provider: SiteSettingsProviderMode;
	revisionId: string | null;
	durationMs: number;
	code?: "unsupported_provider" | "published_revision_missing" | "convex_query_failed";
}

interface SiteSettingsProviderDependencies {
	fetchLegacy: () => Promise<SiteSettingsResult>;
	fetchPublishedCms: () => Promise<PublishedCmsSiteSettingsState | null>;
	log: (entry: CmsReadTelemetry) => void;
	now: () => number;
	siteUrl: string;
}

const defaultDependencies: SiteSettingsProviderDependencies = {
	fetchLegacy: fetchLegacySiteSettings,
	fetchPublishedCms: async () => {
		return (await getConvex().query(api.content.getPublishedSiteSettingsWithRevision, {
			siteUrl: adminConfig.siteUrl,
		})) as PublishedCmsSiteSettingsState | null;
	},
	log: (entry) => console.info("[cms]", entry),
	now: () => Date.now(),
	siteUrl: adminConfig.siteUrl,
};

export function parseSiteSettingsProviderMode(value: string | undefined): {
	mode: SiteSettingsProviderMode;
	invalid: boolean;
} {
	if (value === "shadow" || value === "convex" || value === "fallback") {
		return { mode: value, invalid: false };
	}
	return { mode: "fallback", invalid: Boolean(value?.trim()) };
}

function migratedFields(site: SiteSettingsContent) {
	return {
		artistName: site.artistName,
		siteTitle: site.siteTitle,
		tagline: site.tagline,
		socialLinks: site.socialLinks,
		seoDescription: site.seo.description,
	};
}

function composeCmsResult(
	published: PublishedCmsSiteSettings,
	legacy: SiteSettingsResult,
): SiteSettingsResult {
	return {
		site: {
			artistName: published.artistName,
			siteTitle: published.siteTitle,
			tagline: published.tagline,
			socialLinks: published.socialLinks.map((link) => ({ ...link })),
			seo: {
				description: published.seoDescription,
				// OG media is deliberately outside the text-only CMS-1 slice.
				ogImage: legacy.site.seo.ogImage,
			},
		},
		// Contact settings remain on the legacy provider until CMS-3.
		contact: legacy.contact,
	};
}

function telemetry(
	deps: SiteSettingsProviderDependencies,
	startedAt: number,
	entry: Omit<CmsReadTelemetry, "site" | "kind" | "revisionId" | "durationMs"> & {
		revisionId?: string;
	},
) {
	const { revisionId = null, ...details } = entry;
	deps.log({
		...details,
		site: deps.siteUrl,
		kind: "siteSettings",
		revisionId,
		durationMs: Math.max(0, deps.now() - startedAt),
	});
}

export async function resolveSiteSettings(
	mode: SiteSettingsProviderMode,
	dependencies: Partial<SiteSettingsProviderDependencies> = {},
): Promise<SiteSettingsResult> {
	const deps = { ...defaultDependencies, ...dependencies };
	const startedAt = deps.now();

	if (mode === "fallback") {
		const legacy = await deps.fetchLegacy();
		telemetry(deps, startedAt, { event: "cms.public_read_succeeded", provider: mode });
		return legacy;
	}

	const publishedPromise = deps.fetchPublishedCms().then(
		(value) => ({ ok: true as const, value }),
		() => ({ ok: false as const }),
	);
	const [legacy, publishedResult] = await Promise.all([deps.fetchLegacy(), publishedPromise]);

	if (!publishedResult.ok) {
		telemetry(deps, startedAt, {
			event: mode === "shadow" ? "cms.shadow_unavailable" : "cms.public_read_failed",
			provider: mode,
			code: "convex_query_failed",
		});
		if (mode === "shadow") return legacy;
		throw new Error("Published CMS site settings are unavailable");
	}
	const publishedState = publishedResult.value;

	if (!publishedState) {
		telemetry(deps, startedAt, {
			event: mode === "shadow" ? "cms.shadow_unavailable" : "cms.public_read_failed",
			provider: mode,
			code: "published_revision_missing",
		});
		if (mode === "shadow") return legacy;
		throw new Error("Published CMS site settings are unavailable");
	}

	const cmsResult = composeCmsResult(publishedState.payload, legacy);
	if (mode === "shadow") {
		const matches =
			JSON.stringify(migratedFields(legacy.site)) ===
			JSON.stringify(migratedFields(cmsResult.site));
		telemetry(deps, startedAt, {
			event: matches ? "cms.shadow_match" : "cms.shadow_mismatch",
			provider: mode,
			revisionId: publishedState.revisionId,
		});
		return legacy;
	}

	telemetry(deps, startedAt, {
		event: "cms.public_read_succeeded",
		provider: mode,
		revisionId: publishedState.revisionId,
	});
	return cmsResult;
}

export async function fetchSiteSettings(): Promise<SiteSettingsResult> {
	const entries: Array<CmsReadTelemetry | ContactPageReadTelemetry> = [];
	const parsed = parseSiteSettingsProviderMode(env.SITE_SETTINGS_PROVIDER);
	if (parsed.invalid) {
		entries.push({
			event: "cms.provider_config_invalid",
			site: defaultDependencies.siteUrl,
			kind: "siteSettings",
			provider: "fallback",
			revisionId: null,
			durationMs: 0,
			code: "unsupported_provider",
		});
	}
	try {
		const siteSettings = await resolveSiteSettings(parsed.mode, {
			log: (entry) => entries.push(entry),
		});
		return await applyContactPageProviderWithDependencies(siteSettings, {
			log: (entry) => entries.push(entry),
		});
	} finally {
		// Vercel may retain only one application log per request. Emit the two
		// independent provider events in one content-free structured record.
		console.info("[cms]", entries);
	}
}
