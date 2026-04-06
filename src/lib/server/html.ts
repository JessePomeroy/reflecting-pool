/**
 * Escape untrusted strings for safe inclusion in HTML email templates.
 * Prevents HTML injection when user-provided data (names, messages,
 * shipping addresses, etc.) is interpolated into mail markup.
 */
export function escapeHtml(input: unknown): string {
	if (input == null) return "";
	return String(input)
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&#39;");
}
