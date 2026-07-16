import { describe, expect, it, vi } from "vitest";
import { adminConfig } from "$lib/config/admin";

const { contentApi } = vi.hoisted(() => ({
	contentApi: {
		getSiteSettingsEditorState: "content.getSiteSettingsEditorState",
		saveSiteSettingsDraft: "content.saveSiteSettingsDraft",
		publishSiteSettings: "content.publishSiteSettings",
		discardSiteSettingsDraft: "content.discardSiteSettingsDraft",
	},
}));

vi.mock("$convex/api", () => ({
	api: {
		content: contentApi,
	},
}));

describe("admin Editor configuration", () => {
	it("maps the shared Site editor contract to the Convex content namespace", () => {
		expect(adminConfig.api.siteEditor).toBe(contentApi);
		expect(adminConfig.editor).toEqual({ siteSettings: {} });
		expect(adminConfig.mutationTransport).toBe("http");
	});
});
