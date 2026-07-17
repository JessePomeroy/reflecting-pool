import { describe, expect, it, vi } from "vitest";
import { adminConfig } from "$lib/config/admin";

const { contentApi, portfolioApi, mediaApi } = vi.hoisted(() => ({
	contentApi: {
		getSiteSettingsEditorState: "content.getSiteSettingsEditorState",
		saveSiteSettingsDraft: "content.saveSiteSettingsDraft",
		publishSiteSettings: "content.publishSiteSettings",
		discardSiteSettingsDraft: "content.discardSiteSettingsDraft",
		getHomepageQuoteEditorState: "content.getHomepageQuoteEditorState",
		saveHomepageQuoteDraft: "content.saveHomepageQuoteDraft",
		publishHomepageQuote: "content.publishHomepageQuote",
		discardHomepageQuoteDraft: "content.discardHomepageQuoteDraft",
		getContactPageEditorState: "content.getContactPageEditorState",
		saveContactPageDraft: "content.saveContactPageDraft",
		publishContactPage: "content.publishContactPage",
		discardContactPageDraft: "content.discardContactPageDraft",
		getAboutPageEditorState: "content.getAboutPageEditorState",
		saveAboutPageDraft: "content.saveAboutPageDraft",
		publishAboutPage: "content.publishAboutPage",
		discardAboutPageDraft: "content.discardAboutPageDraft",
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
		registerReadyWebAsset: "mediaAssets.registerReadyWebAsset",
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
		expect(adminConfig.api.siteEditor).not.toBe(contentApi);
		expect(adminConfig.api.siteEditor?.getHomepageQuoteEditorState).toBe(
			contentApi.getHomepageQuoteEditorState,
		);
		expect(adminConfig.api.siteEditor?.getContactPageEditorState).toBe(
			contentApi.getContactPageEditorState,
		);
		expect(adminConfig.api.siteEditor?.getAboutPageEditorState).toBe(
			contentApi.getAboutPageEditorState,
		);
		expect(adminConfig.api.siteEditor?.listMediaAssets).toBe(mediaApi.listForEditor);
		expect(adminConfig.api.siteEditor?.getPlacedMediaAssets).toBe(mediaApi.getManyForEditor);
		const portfolioEditor = adminConfig.api.portfolioEditor;
		expect(portfolioEditor?.listForEditor).toBe(portfolioApi.listForEditor);
		expect(portfolioEditor?.getEditorState).toBe(portfolioApi.getEditorState);
		expect(portfolioEditor?.saveDraft).toBe(portfolioApi.saveDraft);
		expect(portfolioEditor?.publish).toBe(portfolioApi.publish);
		expect(portfolioEditor?.reorder).toBe(portfolioApi.reorder);
		expect(portfolioEditor?.listMediaAssets).toBe(mediaApi.listForEditor);
		expect(portfolioEditor?.getPlacedMediaAssets).toBe(mediaApi.getManyForEditor);
		expect(portfolioEditor?.registerReadyWebAsset).toBe(mediaApi.registerReadyWebAsset);
		expect(adminConfig.editor).toEqual({
			siteSettings: {},
			homepageQuote: {
				initialPayload: {
					text: "The camera does not know what it takes; it captures materials with which you reconstruct, not so much what you saw as what you thought you saw. Hence the best photography is aware, mindful, of illusion and uses illusion, permitting and encouraging it - especially unconscious and powerful illusions that are not usually admitted on the scene.",
					attribution: "Thomas Merton",
				},
				previewEndpoint: "/api/admin/preview/homepage-quote",
			},
			contactPage: {
				initialPayload: {
					heading: "get in touch",
					intro:
						"questions about prints, sessions, or just want to say hello — i'd love to hear from you.",
					email: "hello.margarethelena@gmail.com",
					confirmationMessage: "message received — i'll be in touch soon.",
					bookingEnabled: false,
					bookingLabel: "book a session",
					bookingIntro:
						"portrait sessions, editorial work, and botanical commissions. let's make something together.",
					inquiryChoices: ["portrait session", "print inquiry"],
				},
				previewEndpoint: "/api/admin/preview/contact",
			},
			aboutPage: {
				initialPayload: {
					heading: "about",
					displayName: "margaret helena / maggie mac / zippymiggy",
					sections: expect.arrayContaining([
						expect.objectContaining({ key: "background", title: "background" }),
					]),
					highlights: expect.arrayContaining([
						expect.objectContaining({ key: "based-in", label: "based in" }),
					]),
					portraits: [],
					seoDescription: expect.stringMatching(/margaret helena/i),
				},
				mediaBaseUrl: "https://media.angelsrest.online",
				uploadEndpoint: "/api/admin/media",
			},
			portfolio: {
				mediaBaseUrl: "https://media.angelsrest.online",
				uploadEndpoint: "/api/admin/media",
				previewEndpoint: "/api/admin/preview/portfolio",
			},
		});
		expect(adminConfig.mutationTransport).toBe("http");
	});
});
