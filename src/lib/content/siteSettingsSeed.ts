import type { SiteSettingsDraftPayload } from "@jessepomeroy/admin";

/**
 * Reflecting Pool's intentional starting point for the local Site settings CMS.
 *
 * This is safe to import in the browser. It is only written to Convex after an
 * authenticated admin explicitly chooses "copy current settings" in Editor.
 */
export const siteSettingsEditorSeed = {
	artistName: "margaret helena",
	siteTitle: "margaret helena · photography",
	tagline: "Fine art photography prints, portfolio galleries, booking, and botanical commissions.",
	socialLinks: [{ platform: "instagram", url: "https://www.instagram.com/zippymiggy/" }],
	seoDescription: "Margaret Helena photography, portfolio galleries, booking, and fine art prints.",
} satisfies SiteSettingsDraftPayload;
