import type { AboutPageDraftPayload } from "@jessepomeroy/admin";
import { api } from "$convex/api";
import { env } from "$env/dynamic/private";
import { adminConfig } from "$lib/config/admin";
import {
	type AboutContent,
	type AboutPortraitContent,
	fetchLegacyAboutContent,
} from "$lib/server/content/about";
import {
	type ContentProviderMode,
	parseContentProviderMode,
} from "$lib/server/content/providerMode";
import { getConvex } from "$lib/server/convexClient";

export type AboutPageProviderMode = ContentProviderMode;

interface ImageDerivative {
	key: string;
	width: number;
	height: number;
}

interface ResolvedAboutAsset {
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

export interface AboutEditorMediaAsset extends ResolvedAboutAsset {
	_id: string;
}

export interface PublishedAboutPageState {
	revisionId: string;
	publishedAt: number;
	payload: {
		heading: string;
		displayName: string;
		role?: string;
		introduction?: string;
		biography?: string;
		portraits: Array<{
			key: string;
			order: number;
			altText: string;
			asset: ResolvedAboutAsset;
		}>;
		sections: Array<{ key: string; title: string; items: string[] }>;
		highlights: Array<{ key: string; label: string; value: string }>;
		seoDescription: string;
	};
}

export interface AboutPageReadTelemetry {
	event:
		| "cms.provider_config_invalid"
		| "cms.public_read_succeeded"
		| "cms.public_read_failed"
		| "cms.shadow_match"
		| "cms.shadow_mismatch"
		| "cms.shadow_unavailable";
	site: string;
	kind: "aboutPage";
	provider: AboutPageProviderMode;
	revisionId: string | null;
	durationMs: number;
	code?: "unsupported_provider" | "published_revision_missing" | "convex_query_failed";
}

interface AboutPageProviderDependencies {
	fetchLegacy: () => Promise<AboutContent>;
	fetchPublishedCms: () => Promise<PublishedAboutPageState | null>;
	log: (entry: AboutPageReadTelemetry) => void;
	now: () => number;
	siteUrl: string;
}

const mediaBaseUrl = adminConfig.editor?.aboutPage?.mediaBaseUrl.replace(/\/$/, "") ?? "";
const defaultDependencies: AboutPageProviderDependencies = {
	fetchLegacy: fetchLegacyAboutContent,
	fetchPublishedCms: async () =>
		(await getConvex().query(api.content.getPublishedAboutPageWithRevision, {
			siteUrl: adminConfig.siteUrl,
		})) as PublishedAboutPageState | null,
	log: (entry) => console.info("[cms]", entry),
	now: () => Date.now(),
	siteUrl: adminConfig.siteUrl,
};

function assetUrl(key: string) {
	const encodedKey = key.split("/").map(encodeURIComponent).join("/");
	return `${mediaBaseUrl}/${encodedKey}`;
}

function portraitFromAsset(input: {
	key: string;
	altText?: string;
	asset: ResolvedAboutAsset;
}): AboutPortraitContent {
	const derivatives = input.asset.derivatives;
	return {
		key: input.key,
		src: assetUrl(derivatives.display1280.key),
		srcset: [
			`${assetUrl(derivatives.display1280.key)} ${derivatives.display1280.width}w`,
			`${assetUrl(derivatives.display2048.key)} ${derivatives.display2048.width}w`,
			`${assetUrl(derivatives.display2560.key)} ${derivatives.display2560.width}w`,
		].join(", "),
		width: derivatives.display1280.width,
		height: derivatives.display1280.height,
		altText: input.altText ?? "",
	};
}

export function composePublishedAboutPageResult(
	legacy: AboutContent,
	payload: PublishedAboutPageState["payload"],
): AboutContent {
	return {
		...legacy,
		heading: payload.heading,
		displayName: payload.displayName,
		role: payload.role,
		introduction: payload.introduction ?? "",
		biography: payload.biography ?? "",
		portraits: [...payload.portraits]
			.sort((left, right) => left.order - right.order)
			.map(portraitFromAsset),
		sections: payload.sections.map(({ title, items }) => ({ title, items: [...items] })),
		highlights: payload.highlights.map(({ label, value }) => ({ label, value })),
		seo: {
			description: payload.seoDescription,
			ogImage: legacy.seo.ogImage,
		},
	};
}

export function composeAboutPageDraftResult(
	legacy: AboutContent,
	payload: AboutPageDraftPayload,
	assets: AboutEditorMediaAsset[],
): AboutContent {
	const assetMap = new Map(assets.map((asset) => [asset._id, asset]));
	const portraits = (payload.portraits ?? []).flatMap((portrait) => {
		const asset = assetMap.get(portrait.assetId);
		return asset ? [portraitFromAsset({ ...portrait, asset })] : [];
	});
	return {
		...legacy,
		heading: payload.heading?.trim() ?? "",
		displayName: payload.displayName?.trim() ?? "",
		role: payload.role?.trim() || undefined,
		introduction: payload.introduction?.trim() ?? "",
		biography: payload.biography?.trim() ?? "",
		portraits,
		sections: (payload.sections ?? []).map((section) => ({
			title: section.title?.trim() ?? "",
			items: [...section.items],
		})),
		highlights: (payload.highlights ?? []).map((highlight) => ({
			label: highlight.label?.trim() ?? "",
			value: highlight.value?.trim() ?? "",
		})),
		seo: {
			description: payload.seoDescription?.trim() ?? "",
			ogImage: legacy.seo.ogImage,
		},
	};
}

function migratedFields(content: AboutContent) {
	return {
		heading: content.heading,
		displayName: content.displayName,
		role: content.role,
		introduction: content.introduction,
		biography: content.biography,
		sections: content.sections,
		highlights: content.highlights,
		seoDescription: content.seo.description,
		portraits: content.portraits.map((portrait) => ({
			altText: portrait.altText,
		})),
	};
}

function telemetry(
	deps: AboutPageProviderDependencies,
	startedAt: number,
	entry: Omit<AboutPageReadTelemetry, "site" | "kind" | "revisionId" | "durationMs"> & {
		revisionId?: string;
	},
) {
	const { revisionId = null, ...details } = entry;
	deps.log({
		...details,
		site: deps.siteUrl,
		kind: "aboutPage",
		revisionId,
		durationMs: Math.max(0, deps.now() - startedAt),
	});
}

export async function resolveAboutContent(
	mode: AboutPageProviderMode,
	legacy: AboutContent,
	dependencies: Partial<AboutPageProviderDependencies> = {},
): Promise<AboutContent> {
	const deps = { ...defaultDependencies, ...dependencies };
	const startedAt = deps.now();
	if (mode === "fallback") {
		telemetry(deps, startedAt, { event: "cms.public_read_succeeded", provider: mode });
		return legacy;
	}

	let published: PublishedAboutPageState | null;
	try {
		published = await deps.fetchPublishedCms();
	} catch {
		telemetry(deps, startedAt, {
			event: mode === "shadow" ? "cms.shadow_unavailable" : "cms.public_read_failed",
			provider: mode,
			code: "convex_query_failed",
		});
		if (mode === "shadow") return legacy;
		throw new Error("Published CMS About page is unavailable");
	}
	if (!published) {
		telemetry(deps, startedAt, {
			event: mode === "shadow" ? "cms.shadow_unavailable" : "cms.public_read_failed",
			provider: mode,
			code: "published_revision_missing",
		});
		if (mode === "shadow") return legacy;
		throw new Error("Published CMS About page is unavailable");
	}

	const cms = composePublishedAboutPageResult(legacy, published.payload);
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

export async function fetchAboutContent(
	dependencies: Partial<AboutPageProviderDependencies> = {},
): Promise<AboutContent> {
	const deps = { ...defaultDependencies, ...dependencies };
	const parsed = parseContentProviderMode(env.ABOUT_PAGE_PROVIDER);
	if (parsed.invalid) {
		deps.log({
			event: "cms.provider_config_invalid",
			site: deps.siteUrl,
			kind: "aboutPage",
			provider: "fallback",
			revisionId: null,
			durationMs: 0,
			code: "unsupported_provider",
		});
	}
	const legacy = await deps.fetchLegacy();
	return await resolveAboutContent(parsed.mode, legacy, deps);
}
