import { describe, expect, it } from "vitest";
import { resolveGalleryDisplayImages } from "./displayImages";

const workerUrl = "https://gallery-worker.example.com/";
const access = { token: "gallery-token", accessGrant: "server-grant" };

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
			access,
		);

		expect(image.canPreview).toBe(true);
		expect(image.previewSource).toBe("self");
		expect(image.thumbUrl).toBe(
			"https://gallery-worker.example.com/image/reflecting-pool.com%2Fgalleries%2Ftest%2Fthumb%2Fimage%2001.webp?token=gallery-token&accessGrant=server-grant",
		);
		expect(image.previewUrl).toBe(
			"https://gallery-worker.example.com/image/reflecting-pool.com%2Fgalleries%2Ftest%2Fpreview%2Fimage%2001.webp?token=gallery-token&accessGrant=server-grant",
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
			access,
		);

		const raw = images[1];

		expect(raw.canPreview).toBe(true);
		expect(raw.fileLabel).toBe("raf");
		expect(raw.previewSource).toBe("sidecar");
		expect(raw.thumbUrl).toBe(
			"https://gallery-worker.example.com/image/reflecting-pool.com%2Fgalleries%2Ftest%2Fthumb%2Fimage%2001.jpeg?token=gallery-token&accessGrant=server-grant",
		);
		expect(raw.previewUrl).toBe(
			"https://gallery-worker.example.com/image/reflecting-pool.com%2Fgalleries%2Ftest%2Fpreview%2Fimage%2001.jpeg?token=gallery-token&accessGrant=server-grant",
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
			access,
		);

		expect(image.thumbUrl).toBe(
			"https://gallery-worker.example.com/image/reflecting-pool.com%2Fgalleries%2Ftest%2Fthumb%2Fimage%2001%3F%23.webp?token=gallery-token&accessGrant=server-grant",
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
			access,
		);

		expect(raw.canPreview).toBe(false);
		expect(raw.previewSource).toBe("none");
		expect(raw.fileLabel).toBe("raf");
	});
});
