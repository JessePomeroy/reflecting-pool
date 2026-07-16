import type { GalleryCluster } from "$lib/types/gallery";

interface PreviewPlacement {
	key: string;
	altText?: string | null;
	decorative: boolean;
	assetId: string;
}

interface PreviewAsset {
	_id: string;
	assetId: string;
	derivatives: {
		display1280: { key: string };
	};
}

function seededRandom(seed: number) {
	let state = seed || 1;
	return () => {
		state = (state * 16807) % 2147483647;
		return state / 2147483647;
	};
}

function seedFor(value: string) {
	let seed = 0;
	for (const character of value) seed = (seed * 31 + character.charCodeAt(0)) % 2147483647;
	return seed;
}

function mediaUrl(key: string) {
	return `https://media.angelsrest.online/${key.split("/").map(encodeURIComponent).join("/")}`;
}

export function portfolioDraftPreviewCluster(input: {
	galleryId: string;
	title: string;
	slug: string;
	placements: PreviewPlacement[];
	assets: PreviewAsset[];
}): GalleryCluster {
	const assets = new Map(input.assets.map((asset) => [asset._id, asset]));
	return {
		id: input.galleryId,
		title: input.title || "untitled gallery",
		slug: input.slug,
		images: input.placements.map((placement) => {
			const asset = assets.get(placement.assetId);
			if (!asset) throw new Error("Preview media asset is unavailable");
			const random = seededRandom(seedFor(`${placement.key}:${asset.assetId}`));
			return {
				src: mediaUrl(asset.derivatives.display1280.key),
				alt: placement.decorative ? "" : (placement.altText?.trim() ?? ""),
				depth: 0.25 + random() * 0.65,
				offsetX: -38 + random() * 76,
				offsetY: -28 + random() * 56,
				rotation: -4.5 + random() * 9,
				scale: 0.82 + random() * 0.18,
			};
		}),
	};
}
