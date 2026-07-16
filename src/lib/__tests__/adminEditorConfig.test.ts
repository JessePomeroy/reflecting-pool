import { describe, expect, it, vi } from "vitest";
import { adminConfig } from "$lib/config/admin";

const { contentApi, portfolioApi, mediaApi } = vi.hoisted(() => ({
	contentApi: {
		getSiteSettingsEditorState: "content.getSiteSettingsEditorState",
		saveSiteSettingsDraft: "content.saveSiteSettingsDraft",
		publishSiteSettings: "content.publishSiteSettings",
		discardSiteSettingsDraft: "content.discardSiteSettingsDraft",
	},
	portfolioApi: {
		listForEditor: "portfolioGalleries.listForEditor",
		getEditorState: "portfolioGalleries.getEditorState",
		saveDraft: "portfolioGalleries.saveDraft",
		publish: "portfolioGalleries.publish",
		reorder: "portfolioGalleries.reorder",
	},
	mediaApi: {
		listForEditor: "mediaAssets.listForEditor",
		getManyForEditor: "mediaAssets.getManyForEditor",
	},
}));

vi.mock("$convex/api", () => ({
	api: {
		content: contentApi,
		portfolioGalleries: portfolioApi,
		mediaAssets: mediaApi,
	},
}));

describe("admin Editor configuration", () => {
	it("keeps site content and public Portfolio contracts distinct", () => {
		expect(adminConfig.api.siteEditor).toBe(contentApi);
		const portfolioEditor = adminConfig.api.portfolioEditor;
		expect(portfolioEditor?.listForEditor).toBe(portfolioApi.listForEditor);
		expect(portfolioEditor?.getEditorState).toBe(portfolioApi.getEditorState);
		expect(portfolioEditor?.saveDraft).toBe(portfolioApi.saveDraft);
		expect(portfolioEditor?.publish).toBe(portfolioApi.publish);
		expect(portfolioEditor?.reorder).toBe(portfolioApi.reorder);
		expect(portfolioEditor?.listMediaAssets).toBe(mediaApi.listForEditor);
		expect(portfolioEditor?.getPlacedMediaAssets).toBe(mediaApi.getManyForEditor);
		expect(adminConfig.editor).toEqual({
			siteSettings: {},
			portfolio: { mediaBaseUrl: "https://media.angelsrest.online" },
		});
		expect(adminConfig.mutationTransport).toBe("http");
	});
});
