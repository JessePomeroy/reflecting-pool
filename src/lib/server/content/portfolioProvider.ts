import { api } from "$convex/api";
import { env } from "$env/dynamic/private";
import { adminConfig } from "$lib/config/admin";
import { clusters as fallbackClusters } from "$lib/data/galleries";
import { type PortfolioClusterAsset, portfolioCluster } from "$lib/server/content/portfolioCluster";
import {
	type ContentProviderMode,
	parseContentProviderMode,
} from "$lib/server/content/providerMode";
import { getConvex } from "$lib/server/convexClient";
import type { GalleryCluster } from "$lib/types/gallery";

export type PortfolioProviderMode = ContentProviderMode;

interface PublishedPortfolioPlacement {
	key: string;
	order: number;
	altText: string;
	asset: PortfolioClusterAsset;
}

export interface PublishedPortfolioGallery {
	galleryId: string;
	revisionId: string;
	title: string;
	slug: string;
	portfolioOrder: number;
	placements: PublishedPortfolioPlacement[];
}

export interface PortfolioReadTelemetry {
	event:
		| "cms.provider_config_invalid"
		| "cms.public_read_succeeded"
		| "cms.public_read_failed"
		| "cms.shadow_match"
		| "cms.shadow_mismatch"
		| "cms.shadow_unavailable";
	site: string;
	kind: "portfolio";
	provider: PortfolioProviderMode;
	revisionId: string | null;
	galleryCount: number;
	imageCount: number;
	durationMs: number;
	code?: "unsupported_provider" | "convex_query_failed";
}

interface PortfolioProviderDependencies {
	fetchFallback: () => Promise<GalleryCluster[]>;
	fetchPublishedCms: () => Promise<PublishedPortfolioGallery[]>;
	log: (entry: PortfolioReadTelemetry) => void;
	now: () => number;
	siteUrl: string;
}

function fallbackPortfolio() {
	return fallbackClusters.map((cluster) => ({
		...cluster,
		images: cluster.images.map((image) => ({ ...image })),
	}));
}

const defaultDependencies: PortfolioProviderDependencies = {
	fetchFallback: async () => fallbackPortfolio(),
	fetchPublishedCms: async () => {
		return (await getConvex().query(api.portfolioGalleries.listPublishedWithPlacements, {
			siteUrl: adminConfig.siteUrl,
		})) as PublishedPortfolioGallery[];
	},
	log: (entry) => console.info("[cms]", entry),
	now: () => Date.now(),
	siteUrl: adminConfig.siteUrl,
};

export function publishedPortfolioClusters(
	publishedGalleries: PublishedPortfolioGallery[],
): GalleryCluster[] {
	return [...publishedGalleries]
		.sort((left, right) => left.portfolioOrder - right.portfolioOrder)
		.map((gallery) =>
			portfolioCluster({
				galleryId: gallery.galleryId,
				title: gallery.title,
				slug: gallery.slug,
				placements: [...gallery.placements]
					.sort((left, right) => left.order - right.order)
					.map((placement) => ({
						key: placement.key,
						altText: placement.altText,
						asset: placement.asset,
					})),
			}),
		);
}

function portfolioState(clusters: GalleryCluster[]) {
	return {
		galleryCount: clusters.length,
		imageCount: clusters.reduce((total, cluster) => total + cluster.images.length, 0),
	};
}

function publishedRevisionId(galleries: PublishedPortfolioGallery[]) {
	if (galleries.length === 0) return null;
	if (galleries.length === 1) return galleries[0].revisionId;
	let hash = 2166136261;
	for (const gallery of galleries) {
		for (const character of `${gallery.portfolioOrder}:${gallery.galleryId}:${gallery.revisionId}|`) {
			hash ^= character.charCodeAt(0);
			hash = Math.imul(hash, 16777619);
		}
	}
	return `set:${galleries.length}:${(hash >>> 0).toString(16).padStart(8, "0")}`;
}

function telemetry(
	deps: PortfolioProviderDependencies,
	startedAt: number,
	clusters: GalleryCluster[],
	entry: Omit<
		PortfolioReadTelemetry,
		"site" | "kind" | "revisionId" | "galleryCount" | "imageCount" | "durationMs"
	> & { revisionId?: string | null },
) {
	const { revisionId = null, ...details } = entry;
	deps.log({
		...details,
		site: deps.siteUrl,
		kind: "portfolio",
		revisionId,
		...portfolioState(clusters),
		durationMs: Math.max(0, deps.now() - startedAt),
	});
}

export async function resolvePortfolio(
	mode: PortfolioProviderMode,
	dependencies: Partial<PortfolioProviderDependencies> = {},
): Promise<GalleryCluster[]> {
	const deps = { ...defaultDependencies, ...dependencies };
	const startedAt = deps.now();

	if (mode === "fallback") {
		const fallback = await deps.fetchFallback();
		telemetry(deps, startedAt, fallback, {
			event: "cms.public_read_succeeded",
			provider: mode,
		});
		return fallback;
	}

	const publishedPromise = deps.fetchPublishedCms().then(
		(value) => ({ ok: true as const, value }),
		() => ({ ok: false as const }),
	);
	const [shadowFallback, publishedResult] = await Promise.all([
		mode === "shadow" ? deps.fetchFallback() : Promise.resolve([]),
		publishedPromise,
	]);
	if (!publishedResult.ok) {
		telemetry(deps, startedAt, shadowFallback, {
			event: mode === "shadow" ? "cms.shadow_unavailable" : "cms.public_read_failed",
			provider: mode,
			code: "convex_query_failed",
		});
		if (mode === "shadow") return shadowFallback;
		throw new Error("Published CMS portfolio is unavailable");
	}

	const published = publishedResult.value;
	const cms = publishedPortfolioClusters(published);
	const revisionId = publishedRevisionId(published);
	if (mode === "shadow") {
		const matches = JSON.stringify(shadowFallback) === JSON.stringify(cms);
		telemetry(deps, startedAt, cms, {
			event: matches ? "cms.shadow_match" : "cms.shadow_mismatch",
			provider: mode,
			revisionId,
		});
		return shadowFallback;
	}

	telemetry(deps, startedAt, cms, {
		event: "cms.public_read_succeeded",
		provider: mode,
		revisionId,
	});
	return cms;
}

export async function fetchPortfolioClusters() {
	const parsed = parseContentProviderMode(env.PORTFOLIO_PROVIDER);
	if (parsed.invalid) {
		defaultDependencies.log({
			event: "cms.provider_config_invalid",
			site: defaultDependencies.siteUrl,
			kind: "portfolio",
			provider: "fallback",
			revisionId: null,
			galleryCount: 0,
			imageCount: 0,
			durationMs: 0,
			code: "unsupported_provider",
		});
	}
	return await resolvePortfolio(parsed.mode);
}
