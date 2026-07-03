import { describe, expect, it } from "vitest";
import { resolveGalleryDisplayImages } from "./displayImages";

const workerUrl = "https://gallery-worker.example.com/";

describe("resolveGalleryDisplayImages", () => {
	it("uses browser-previewable images as their own thumbnail and preview source", () => {
		const [image] = resolveGalleryDisplayImages(
			[
				{
					filename: "image 01.webp",
					r2Key: "reflecting-pool.com/galleries/test/original/image 01.webp",
				},
			],
			workerUrl,
		);

		expect(image.canPreview).toBe(true);
		expect(image.previewSource).toBe("self");
		expect(image.thumbUrl).toBe(
			"https://gallery-worker.example.com/image/reflecting-pool.com%2Fgalleries%2Ftest%2Fthumb%2Fimage%2001.webp",
		);
		expect(image.previewUrl).toBe(
			"https://gallery-worker.example.com/image/reflecting-pool.com%2Fgalleries%2Ftest%2Fpreview%2Fimage%2001.webp",
		);
	});

	it("uses same-stem JPEG sidecars as RAW thumbnails and previews", () => {
		const images = resolveGalleryDisplayImages(
			[
				{
					filename: "image 01.jpeg",
					r2Key: "reflecting-pool.com/galleries/test/original/image 01.jpeg",
				},
				{
					filename: "image 01.raf",
					r2Key: "reflecting-pool.com/galleries/test/original/image 01.raf",
				},
			],
			workerUrl,
		);

		const raw = images[1];

		expect(raw.canPreview).toBe(true);
		expect(raw.fileLabel).toBe("raf");
		expect(raw.previewSource).toBe("sidecar");
		expect(raw.thumbUrl).toBe(
			"https://gallery-worker.example.com/image/reflecting-pool.com%2Fgalleries%2Ftest%2Fthumb%2Fimage%2001.jpeg",
		);
		expect(raw.previewUrl).toBe(
			"https://gallery-worker.example.com/image/reflecting-pool.com%2Fgalleries%2Ftest%2Fpreview%2Fimage%2001.jpeg",
		);
	});

	it("encodes preview keys with URL-significant characters", () => {
		const [image] = resolveGalleryDisplayImages(
			[
				{
					filename: "image 01?#.webp",
					r2Key: "reflecting-pool.com/galleries/test/original/image 01?#.webp",
				},
			],
			workerUrl,
		);

		expect(image.thumbUrl).toBe(
			"https://gallery-worker.example.com/image/reflecting-pool.com%2Fgalleries%2Ftest%2Fthumb%2Fimage%2001%3F%23.webp",
		);
	});

	it("keeps unmatched RAW files as non-previewable file tiles", () => {
		const [raw] = resolveGalleryDisplayImages(
			[
				{
					filename: "image 99.raf",
					r2Key: "reflecting-pool.com/galleries/test/original/image 99.raf",
				},
			],
			workerUrl,
		);

		expect(raw.canPreview).toBe(false);
		expect(raw.previewSource).toBe("none");
		expect(raw.fileLabel).toBe("raf");
	});
});
