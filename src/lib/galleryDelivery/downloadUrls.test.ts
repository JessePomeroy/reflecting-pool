import { describe, expect, it } from "vitest";
import { galleryOriginalDownloadUrl, galleryZipDownloadUrl } from "./downloadUrls";

describe("galleryOriginalDownloadUrl", () => {
	it("encodes R2 keys and gallery tokens for Worker download routes", () => {
		expect(
			galleryOriginalDownloadUrl(
				"https://gallery-worker.example.com/",
				"reflecting-pool.com/galleries/client set/original/image 01.raf",
				"portal/token?abc",
			),
		).toBe(
			"https://gallery-worker.example.com/download/reflecting-pool.com%2Fgalleries%2Fclient%20set%2Foriginal%2Fimage%2001.raf?token=portal%2Ftoken%3Fabc",
		);
	});

	it("normalizes ZIP download routes for trailing-slash Worker URLs", () => {
		expect(galleryZipDownloadUrl("https://gallery-worker.example.com/")).toBe(
			"https://gallery-worker.example.com/download/zip",
		);
	});
});
