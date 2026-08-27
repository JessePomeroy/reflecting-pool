import type { ContactPageDraftPayload } from "@jessepomeroy/admin";
import { api } from "$convex/api";
import { env } from "$env/dynamic/private";
import { adminConfig } from "$lib/config/admin";
import {
	type ContentProviderMode,
	parseContentProviderMode,
} from "$lib/server/content/providerMode";
import type { ContactSettingsContent, SiteSettingsResult } from "$lib/server/content/siteSettings";
import { getConvex } from "$lib/server/convexClient";

export type ContactPageProviderMode = ContentProviderMode;

export interface PublishedContactPageState {
	revisionId: string;
	publishedAt: number;
	payload: PublishedContactPagePayload;
}

export interface PublishedContactPagePayload {
	heading: string;
	intro: string;
	email: string;
	phone?: string;
	availability?: string;
	responseTime?: string;
	confirmationMessage: string;
	booking: {
		enabled: boolean;
		url?: string;
		label: string;
		intro: string;
	};
	inquiryChoices: string[];
}

export interface ContactPageReadTelemetry {
	event:
		| "cms.provider_config_invalid"
		| "cms.public_read_succeeded"
		| "cms.public_read_failed"
		| "cms.shadow_match"
		| "cms.shadow_mismatch"
		| "cms.shadow_unavailable";
	site: string;
	kind: "contactPage";
	provider: ContactPageProviderMode;
	revisionId: string | null;
	durationMs: number;
	code?: "unsupported_provider" | "published_revision_missing" | "convex_query_failed";
}

interface ContactPageProviderDependencies {
	fetchPublishedCms: () => Promise<PublishedContactPageState | null>;
	log: (entry: ContactPageReadTelemetry) => void;
	now: () => number;
	siteUrl: string;
}

const defaultDependencies: ContactPageProviderDependencies = {
	fetchPublishedCms: async () => {
		return (await getConvex().query(api.content.getPublishedContactPageWithRevision, {
			siteUrl: adminConfig.siteUrl,
		})) as PublishedContactPageState | null;
	},
	log: (entry) => console.info("[cms]", entry),
	now: () => Date.now(),
	siteUrl: adminConfig.siteUrl,
};

function optionalText(value: string | undefined) {
	const normalized = value?.trim();
	return normalized || undefined;
}

function publicUrl(value: string | undefined) {
	const normalized = optionalText(value);
	if (!normalized) return undefined;
	try {
		const url = new URL(normalized);
		if (!["http:", "https:"].includes(url.protocol) || url.username || url.password)
			return undefined;
		return url.toString();
	} catch {
		return undefined;
	}
}

function calLink(url: string | undefined) {
	if (!url) return undefined;
	const parsed = new URL(url);
	if (parsed.hostname !== "cal.com" && !parsed.hostname.endsWith(".cal.com")) return undefined;
	const path = parsed.pathname.replace(/^\/+|\/+$/g, "");
	return path || undefined;
}

export function composeContactPageResult(
	legacy: SiteSettingsResult,
	payload: ContactPageDraftPayload,
): SiteSettingsResult {
	return composePublishedContactPageResult(legacy, {
		heading: payload.heading?.trim() ?? "",
		intro: payload.intro?.trim() ?? "",
		email: payload.email?.trim() ?? "",
		phone: optionalText(payload.phone),
		availability: optionalText(payload.availability),
		responseTime: optionalText(payload.responseTime),
		confirmationMessage: payload.confirmationMessage?.trim() ?? "",
		booking: {
			enabled: payload.bookingEnabled === true,
			url: payload.bookingUrl,
			label: payload.bookingLabel?.trim() ?? "",
			intro: payload.bookingIntro?.trim() ?? "",
		},
		inquiryChoices: (payload.inquiryChoices ?? []).map((choice) => choice.trim()),
	});
}

export function composePublishedContactPageResult(
	legacy: SiteSettingsResult,
	payload: PublishedContactPagePayload,
): SiteSettingsResult {
	const bookingUrl = payload.booking.enabled ? publicUrl(payload.booking.url) : undefined;
	return {
		...legacy,
		contact: {
			heading: payload.heading.trim(),
			intro: payload.intro.trim(),
			email: payload.email.trim(),
			phone: optionalText(payload.phone),
			availability: optionalText(payload.availability),
			responseTime: optionalText(payload.responseTime),
			confirmationMessage: payload.confirmationMessage.trim(),
			inquiryChoices: payload.inquiryChoices.map((choice) => choice.trim()),
			booking: {
				enabled: Boolean(payload.booking.enabled && bookingUrl),
				url: bookingUrl,
				label: payload.booking.label.trim(),
				intro: payload.booking.intro.trim(),
				calLink: calLink(bookingUrl),
				calConfig: legacy.contact.booking.calConfig,
			},
		},
	};
}

function migratedFields(contact: ContactSettingsContent) {
	return {
		heading: contact.heading,
		intro: contact.intro,
		email: contact.email,
		phone: contact.phone,
		availability: contact.availability,
		responseTime: contact.responseTime,
		confirmationMessage: contact.confirmationMessage,
		inquiryChoices: contact.inquiryChoices,
		bookingEnabled: contact.booking.enabled,
		bookingUrl: contact.booking.url,
		bookingLabel: contact.booking.label,
		bookingIntro: contact.booking.intro,
	};
}

function matchesMigratedFields(legacy: ContactSettingsContent, cms: ContactSettingsContent) {
	const left = migratedFields(legacy);
	const right = migratedFields(cms);
	return (
		left.heading === right.heading &&
		left.intro === right.intro &&
		left.email === right.email &&
		left.phone === right.phone &&
		left.availability === right.availability &&
		left.responseTime === right.responseTime &&
		left.confirmationMessage === right.confirmationMessage &&
		left.bookingEnabled === right.bookingEnabled &&
		left.bookingUrl === right.bookingUrl &&
		left.bookingLabel === right.bookingLabel &&
		left.bookingIntro === right.bookingIntro &&
		left.inquiryChoices.length === right.inquiryChoices.length &&
		left.inquiryChoices.every((choice, index) => choice === right.inquiryChoices[index])
	);
}

function telemetry(
	deps: ContactPageProviderDependencies,
	startedAt: number,
	entry: Omit<ContactPageReadTelemetry, "site" | "kind" | "revisionId" | "durationMs"> & {
		revisionId?: string;
	},
) {
	const { revisionId = null, ...details } = entry;
	deps.log({
		...details,
		site: deps.siteUrl,
		kind: "contactPage",
		revisionId,
		durationMs: Math.max(0, deps.now() - startedAt),
	});
}

export async function resolveContactPageSettings(
	mode: ContactPageProviderMode,
	legacy: SiteSettingsResult,
	dependencies: Partial<ContactPageProviderDependencies> = {},
): Promise<SiteSettingsResult> {
	const deps = { ...defaultDependencies, ...dependencies };
	const startedAt = deps.now();

	if (mode === "fallback") {
		telemetry(deps, startedAt, { event: "cms.public_read_succeeded", provider: mode });
		return legacy;
	}

	let published: PublishedContactPageState | null;
	try {
		published = await deps.fetchPublishedCms();
	} catch {
		telemetry(deps, startedAt, {
			event: mode === "shadow" ? "cms.shadow_unavailable" : "cms.public_read_failed",
			provider: mode,
			code: "convex_query_failed",
		});
		if (mode === "shadow") return legacy;
		throw new Error("Published CMS Contact page is unavailable");
	}

	if (!published) {
		telemetry(deps, startedAt, {
			event: mode === "shadow" ? "cms.shadow_unavailable" : "cms.public_read_failed",
			provider: mode,
			code: "published_revision_missing",
		});
		if (mode === "shadow") return legacy;
		throw new Error("Published CMS Contact page is unavailable");
	}

	const cms = composePublishedContactPageResult(legacy, published.payload);
	if (mode === "shadow") {
		telemetry(deps, startedAt, {
			event: matchesMigratedFields(legacy.contact, cms.contact)
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

export async function applyContactPageProviderWithDependencies(
	legacy: SiteSettingsResult,
	dependencies: Partial<ContactPageProviderDependencies> = {},
) {
	const deps = { ...defaultDependencies, ...dependencies };
	const parsed = parseContentProviderMode(env.CONTACT_PAGE_PROVIDER);
	if (parsed.invalid) {
		deps.log({
			event: "cms.provider_config_invalid",
			site: deps.siteUrl,
			kind: "contactPage",
			provider: "fallback",
			revisionId: null,
			durationMs: 0,
			code: "unsupported_provider",
		});
	}
	return await resolveContactPageSettings(parsed.mode, legacy, deps);
}
