import { api } from "$convex/api";
import { env } from "$env/dynamic/private";
import { adminConfig } from "$lib/config/admin";
import { fetchLegacyHomepageContent, type HomepageContent } from "$lib/server/content/homepage";
import { getConvex } from "$lib/server/convexClient";

export type HomepageQuoteProviderMode = "fallback" | "shadow" | "convex";

export interface PublishedHomepageQuoteState {
	revisionId: string;
	publishedAt: number;
	payload: {
		text: string;
		attribution: string;
	};
}

export interface HomepageQuoteReadTelemetry {
	event:
		| "cms.provider_config_invalid"
		| "cms.public_read_succeeded"
		| "cms.public_read_failed"
		| "cms.shadow_match"
		| "cms.shadow_mismatch"
		| "cms.shadow_unavailable";
	site: string;
	kind: "homepageQuote";
	provider: HomepageQuoteProviderMode;
	revisionId: string | null;
	durationMs: number;
	code?: "unsupported_provider" | "published_revision_missing" | "convex_query_failed";
}

interface HomepageQuoteProviderDependencies {
	fetchLegacy: () => Promise<HomepageContent>;
	fetchPublishedCms: () => Promise<PublishedHomepageQuoteState | null>;
	log: (entry: HomepageQuoteReadTelemetry) => void;
	now: () => number;
	siteUrl: string;
}

const defaultDependencies: HomepageQuoteProviderDependencies = {
	fetchLegacy: fetchLegacyHomepageContent,
	fetchPublishedCms: async () => {
		return (await getConvex().query(api.content.getPublishedHomepageQuoteWithRevision, {
			siteUrl: adminConfig.siteUrl,
		})) as PublishedHomepageQuoteState | null;
	},
	log: (entry) => console.info("[cms]", entry),
	now: () => Date.now(),
	siteUrl: adminConfig.siteUrl,
};

export function parseHomepageQuoteProviderMode(value: string | undefined): {
	mode: HomepageQuoteProviderMode;
	invalid: boolean;
} {
	if (value === "shadow" || value === "convex" || value === "fallback") {
		return { mode: value, invalid: false };
	}
	return { mode: "fallback", invalid: Boolean(value?.trim()) };
}

function withPublishedQuote(
	legacy: HomepageContent,
	published: PublishedHomepageQuoteState,
): HomepageContent {
	return {
		...legacy,
		quote: { ...published.payload },
	};
}

function telemetry(
	deps: HomepageQuoteProviderDependencies,
	startedAt: number,
	entry: Omit<HomepageQuoteReadTelemetry, "site" | "kind" | "revisionId" | "durationMs"> & {
		revisionId?: string;
	},
) {
	const { revisionId = null, ...details } = entry;
	deps.log({
		...details,
		site: deps.siteUrl,
		kind: "homepageQuote",
		revisionId,
		durationMs: Math.max(0, deps.now() - startedAt),
	});
}

export async function resolveHomepageContent(
	mode: HomepageQuoteProviderMode,
	dependencies: Partial<HomepageQuoteProviderDependencies> = {},
): Promise<HomepageContent> {
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
		throw new Error("Published CMS Homepage Quote is unavailable");
	}
	const published = publishedResult.value;
	if (!published) {
		telemetry(deps, startedAt, {
			event: mode === "shadow" ? "cms.shadow_unavailable" : "cms.public_read_failed",
			provider: mode,
			code: "published_revision_missing",
		});
		if (mode === "shadow") return legacy;
		throw new Error("Published CMS Homepage Quote is unavailable");
	}

	const cms = withPublishedQuote(legacy, published);
	if (mode === "shadow") {
		telemetry(deps, startedAt, {
			event:
				legacy.quote.text === cms.quote.text &&
				legacy.quote.attribution === cms.quote.attribution
					? "cms.shadow_match"
					: "cms.shadow_mismatch",
			provider: mode,
			revisionId: published.revisionId,
		});
		return legacy;
	}

	telemetry(deps, startedAt, {
		event: "cms.public_read_succeeded",
		provider: mode,
		revisionId: published.revisionId,
	});
	return cms;
}

export async function fetchHomepageContent(): Promise<HomepageContent> {
	const parsed = parseHomepageQuoteProviderMode(env.HOMEPAGE_QUOTE_PROVIDER);
	if (parsed.invalid) {
		defaultDependencies.log({
			event: "cms.provider_config_invalid",
			site: defaultDependencies.siteUrl,
			kind: "homepageQuote",
			provider: "fallback",
			revisionId: null,
			durationMs: 0,
			code: "unsupported_provider",
		});
	}
	return await resolveHomepageContent(parsed.mode);
}
