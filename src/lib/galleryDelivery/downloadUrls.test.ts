import { describe, expect, it } from "vitest";
import {
	galleryOriginalDownloadUrl,
	galleryPreparedZipArchiveUrl,
	galleryPreparedZipStatusUrl,
	galleryPrepareZipDownloadUrl,
	galleryZipDownloadUrl,
} from "./downloadUrls";

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

	it("normalizes prepared ZIP routes and encodes request tokens", () => {
		expect(galleryPrepareZipDownloadUrl("https://gallery-worker.example.com/")).toBe(
			"https://gallery-worker.example.com/download/zip/prepare",
		);
		expect(
			galleryPreparedZipStatusUrl(
				"https://gallery-worker.example.com/",
				"request/with spaces",
				"portal/token?abc",
			),
		).toBe(
			"https://gallery-worker.example.com/download/zip/prepare/request%2Fwith%20spaces?token=portal%2Ftoken%3Fabc",
		);
		expect(
			galleryPreparedZipArchiveUrl(
				"https://gallery-worker.example.com/",
				"/download/zip/prepare/request-123/archive",
				"portal/token?abc",
			),
		).toBe(
			"https://gallery-worker.example.com/download/zip/prepare/request-123/archive?token=portal%2Ftoken%3Fabc",
		);
	});
});
