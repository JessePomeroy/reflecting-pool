import { describe, expect, it, vi } from "vitest";
import { adminConfig } from "$lib/config/admin";

const { contentApi, portfolioApi } = vi.hoisted(() => ({
	contentApi: {
		getSiteSettingsEditorState: "content.getSiteSettingsEditorState",
		saveSiteSettingsDraft: "content.saveSiteSettingsDraft",
		publishSiteSettings: "content.publishSiteSettings",
		discardSiteSettingsDraft: "content.discardSiteSettingsDraft",
	},
	portfolioApi: {
		listForEditor: "portfolioGalleries.listForEditor",
		saveDraft: "portfolioGalleries.saveDraft",
	},
}));

vi.mock("$convex/api", () => ({
	api: {
		content: contentApi,
		portfolioGalleries: portfolioApi,
	},
}));

describe("admin Editor configuration", () => {
	it("keeps site content and public Portfolio contracts distinct", () => {
		expect(adminConfig.api.siteEditor).toBe(contentApi);
		expect(adminConfig.api.portfolioEditor).toBe(portfolioApi);
		expect(adminConfig.editor).toEqual({ siteSettings: {}, portfolio: {} });
		expect(adminConfig.mutationTransport).toBe("http");
	});
});
