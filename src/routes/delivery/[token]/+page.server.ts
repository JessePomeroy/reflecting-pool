import { error } from "@sveltejs/kit";
import { ConvexHttpClient } from "convex/browser";
import { api } from "$convex/api";
import type { Id } from "$convex/dataModel";
import { env as publicEnv } from "$env/dynamic/public";
import { getGalleryWorkerUrl } from "$lib/server/galleryWorkerUrl";
import type { PageServerLoad } from "./$types";

/**
 * Server loader for the customer-facing gallery delivery page. Receives a
 * token that was minted via `portal.createToken({ type: "gallery" })` by
 * the admin-dashboard share flow. The token is the caller's authorization —
 * anyone with the link sees the gallery.
 *
 * Failure modes:
 *   - 404 when the token doesn't exist (or references a deleted gallery)
 *   - 410 when the token has expired (gallery tokens don't get marked
 *     "used", so `used: true` shouldn't happen for type="gallery")
 *
 * We compute thumb/preview/download URLs on the server so the client can
 * just render them; keeps the gallery-worker URL out of client bundles.
 */
let _convex: ConvexHttpClient | null = null;
function getConvex() {
	if (!_convex) {
		_convex = new ConvexHttpClient(publicEnv.PUBLIC_CONVEX_URL || "");
	}
	return _convex;
}

export const load: PageServerLoad = async ({ params }) => {
	const { token } = params;
	const convex = getConvex();

	const result = await convex.query(api.portal.getByToken, { token });

	if (!result) {
		throw error(404, "This gallery link is not valid.");
	}

	if (result.expired) {
		throw error(410, "This gallery link has expired.");
	}

	if (result.token.type !== "gallery") {
		throw error(404, "Invalid gallery link.");
	}

	const gallery = result.document as {
		_id: Id<"galleries">;
		name: string;
		slug: string;
		status: string;
		imageCount: number;
		downloadEnabled: boolean;
		favoritesEnabled: boolean;
		password?: string;
		coverImageKey?: string;
	};

	if (!gallery || gallery.status !== "published") {
		throw error(404, "This gallery is not available.");
	}

	const images = await convex.query(api.galleries.getImages, {
		galleryId: gallery._id,
	});

	const workerUrl = getGalleryWorkerUrl();

	return {
		token,
		gallery,
		images: images.map((img) => ({
			...img,
			thumbUrl: `${workerUrl}/image/${img.r2Key.replace("/original/", "/thumb/")}`,
			previewUrl: `${workerUrl}/image/${img.r2Key.replace("/original/", "/preview/")}`,
			downloadUrl: `${workerUrl}/download/${img.r2Key}?token=${token}`,
		})),
		client: result.client,
		workerUrl,
	};
};
