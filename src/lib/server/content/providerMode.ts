export type ContentProviderMode = "fallback" | "shadow" | "convex";

export function parseContentProviderMode(value: string | undefined): {
	mode: ContentProviderMode;
	invalid: boolean;
} {
	if (value === "fallback" || value === "shadow" || value === "convex") {
		return { mode: value, invalid: false };
	}

	return { mode: "fallback", invalid: Boolean(value?.trim()) };
}
