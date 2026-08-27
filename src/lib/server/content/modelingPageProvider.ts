import type { ModelingPageDraftPayload } from "@jessepomeroy/admin";
import { api } from "$convex/api";
import { env } from "$env/dynamic/private";
import { adminConfig } from "$lib/config/admin";
import {
	fetchLegacyModelingPageContent,
	type ModelingImage,
	type ModelingPageContent,
} from "$lib/server/content/modeling";
import {
	type ContentProviderMode,
	parseContentProviderMode,
} from "$lib/server/content/providerMode";
import { getConvex } from "$lib/server/convexClient";

export type ModelingPageProviderMode = ContentProviderMode;

interface ImageDerivative {
	key: string;
	width: number;
	height: number;
}

interface ResolvedModelingAsset {
	assetId: string;
	source: { width: number; height: number };
	derivatives: {
		thumb: ImageDerivative;
		card: ImageDerivative;
		display1280: ImageDerivative;
		display2048: ImageDerivative;
		display2560: ImageDerivative;
	};
}

export interface ModelingEditorMediaAsset extends ResolvedModelingAsset {
	_id: string;
}

interface ResolvedModelingImage {
	key: string;
	order: number;
	altText: string;
	asset: ResolvedModelingAsset;
}

export interface PublishedModelingPageState {
	revisionId: string;
	publishedAt: number;
	payload: {
		heading: string;
		intro?: string;
		galleries: Array<{
			key: string;
			order: number;
			title: string;
			slug: string;
			description?: string;
			images: ResolvedModelingImage[];
		}>;
		seoDescription: string;
	};
}

export interface ModelingPageReadTelemetry {
	event:
		| "cms.provider_config_invalid"
		| "cms.public_read_succeeded"
		| "cms.public_read_failed"
		| "cms.shadow_match"
		| "cms.shadow_mismatch"
		| "cms.shadow_unavailable";
	site: string;
	kind: "modelingPage";
	provider: ModelingPageProviderMode;
	revisionId: string | null;
	durationMs: number;
	code?: "unsupported_provider" | "published_revision_missing" | "convex_query_failed";
}

interface ModelingPageProviderDependencies {
	fetchLegacy: () => Promise<ModelingPageContent>;
	fetchPublishedCms: () => Promise<PublishedModelingPageState | null>;
	log: (entry: ModelingPageReadTelemetry) => void;
	now: () => number;
	siteUrl: string;
}

const mediaBaseUrl = adminConfig.editor?.modelingPage?.mediaBaseUrl.replace(/\/$/, "") ?? "";
const defaultDependencies: ModelingPageProviderDependencies = {
	fetchLegacy: fetchLegacyModelingPageContent,
	fetchPublishedCms: async () =>
		(await getConvex().query(api.content.getPublishedModelingPageWithRevision, {
			siteUrl: adminConfig.siteUrl,
		})) as PublishedModelingPageState | null,
	log: (entry) => console.info("[cms]", entry),
	now: () => Date.now(),
	siteUrl: adminConfig.siteUrl,
};

function assetUrl(key: string) {
	const encodedKey = key.split("/").map(encodeURIComponent).join("/");
	return `${mediaBaseUrl}/${encodedKey}`;
}

function imageFromAsset(input: {
	key: string;
	altText?: string;
	asset: ResolvedModelingAsset;
}): ModelingImage {
	const derivatives = input.asset.derivatives;
	return {
		id: input.key,
		src: assetUrl(derivatives.display1280.key),
		srcset: [
			`${assetUrl(derivatives.display1280.key)} ${derivatives.display1280.width}w`,
			`${assetUrl(derivatives.display2048.key)} ${derivatives.display2048.width}w`,
			`${assetUrl(derivatives.display2560.key)} ${derivatives.display2560.width}w`,
		].join(", "),
		width: derivatives.display1280.width,
		height: derivatives.display1280.height,
		alt: input.altText ?? "",
	};
}

export function composePublishedModelingPageResult(
	legacy: ModelingPageContent,
	payload: PublishedModelingPageState["payload"],
): ModelingPageContent {
	return {
		heading: payload.heading,
		intro: payload.intro,
		galleries: [...payload.galleries]
			.sort((left, right) => left.order - right.order)
			.map((gallery) => ({
				title: gallery.title,
				slug: gallery.slug,
				description: gallery.description,
				images: [...gallery.images]
					.sort((left, right) => left.order - right.order)
					.map(imageFromAsset),
			})),
		seo: {
			description: payload.seoDescription,
			ogImage: legacy.seo.ogImage,
		},
	};
}

export function composeModelingPageDraftResult(
	legacy: ModelingPageContent,
	payload: ModelingPageDraftPayload,
	assets: ModelingEditorMediaAsset[],
): ModelingPageContent {
	const assetMap = new Map(assets.map((asset) => [asset._id, asset]));
	return {
		heading: payload.heading?.trim() ?? "",
		intro: payload.intro?.trim() || undefined,
		galleries: (payload.galleries ?? [])
			.filter((gallery) => gallery.isVisible)
			.map((gallery) => ({
				title: gallery.title?.trim() ?? "",
				slug: gallery.slug?.trim() ?? "",
				description: gallery.description?.trim() || undefined,
				images: (gallery.images ?? []).flatMap((image) => {
					const asset = assetMap.get(image.assetId);
					return asset ? [imageFromAsset({ ...image, asset })] : [];
				}),
			})),
		seo: {
			description: payload.seoDescription?.trim() ?? "",
			ogImage: legacy.seo.ogImage,
		},
	};
}

function migratedFields(content: ModelingPageContent) {
	return {
		heading: content.heading,
		intro: content.intro,
		galleries: content.galleries.map((gallery) => ({
			title: gallery.title,
			slug: gallery.slug,
			description: gallery.description,
			images: gallery.images.map((image) => ({
				alt: image.alt,
			})),
		})),
		seoDescription: content.seo.description,
	};
}

function telemetry(
	deps: ModelingPageProviderDependencies,
	startedAt: number,
	entry: Omit<ModelingPageReadTelemetry, "site" | "kind" | "revisionId" | "durationMs"> & {
		revisionId?: string;
	},
) {
	const { revisionId = null, ...details } = entry;
	deps.log({
		...details,
		site: deps.siteUrl,
		kind: "modelingPage",
		revisionId,
		durationMs: Math.max(0, deps.now() - startedAt),
	});
}

export async function resolveModelingPageContent(
	mode: ModelingPageProviderMode,
	legacy: ModelingPageContent,
	dependencies: Partial<ModelingPageProviderDependencies> = {},
): Promise<ModelingPageContent> {
	const deps = { ...defaultDependencies, ...dependencies };
	const startedAt = deps.now();
	if (mode === "fallback") {
		telemetry(deps, startedAt, { event: "cms.public_read_succeeded", provider: mode });
		return legacy;
	}

	let published: PublishedModelingPageState | null;
	try {
		published = await deps.fetchPublishedCms();
	} catch {
		telemetry(deps, startedAt, {
			event: mode === "shadow" ? "cms.shadow_unavailable" : "cms.public_read_failed",
			provider: mode,
			code: "convex_query_failed",
		});
		if (mode === "shadow") return legacy;
		throw new Error("Published CMS Modeling page is unavailable");
	}
	if (!published) {
		telemetry(deps, startedAt, {
			event: mode === "shadow" ? "cms.shadow_unavailable" : "cms.public_read_failed",
			provider: mode,
			code: "published_revision_missing",
		});
		if (mode === "shadow") return legacy;
		throw new Error("Published CMS Modeling page is unavailable");
	}

	const cms = composePublishedModelingPageResult(legacy, published.payload);
	if (mode === "shadow") {
		telemetry(deps, startedAt, {
			event:
				JSON.stringify(migratedFields(legacy)) === JSON.stringify(migratedFields(cms))
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

export async function fetchModelingPageContent(
	dependencies: Partial<ModelingPageProviderDependencies> = {},
): Promise<ModelingPageContent> {
	const deps = { ...defaultDependencies, ...dependencies };
	const parsed = parseContentProviderMode(env.MODELING_PAGE_PROVIDER);
	if (parsed.invalid) {
		deps.log({
			event: "cms.provider_config_invalid",
			site: deps.siteUrl,
			kind: "modelingPage",
			provider: "fallback",
			revisionId: null,
			durationMs: 0,
			code: "unsupported_provider",
		});
	}
	const legacy = await deps.fetchLegacy();
	return await resolveModelingPageContent(parsed.mode, legacy, deps);
}
