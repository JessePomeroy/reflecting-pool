import type { GalleryCluster } from "$lib/types/gallery";

interface PublicDerivative {
	key: string;
	width: number;
	height: number;
}

export interface PortfolioClusterAsset {
	assetId: string;
	derivatives: {
		thumb: PublicDerivative;
		card: PublicDerivative;
		display1280: PublicDerivative;
		display2048: PublicDerivative;
		display2560: PublicDerivative;
	};
}

export interface PortfolioClusterPlacement {
	key: string;
	altText?: string | null;
	decorative: boolean;
	asset: PortfolioClusterAsset;
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

function responsiveSources(asset: PortfolioClusterAsset) {
	const byWidth = new Map<number, string>();
	for (const derivative of Object.values(asset.derivatives)) {
		if (
			Number.isSafeInteger(derivative.width) &&
			derivative.width > 0 &&
			!byWidth.has(derivative.width)
		) {
			byWidth.set(derivative.width, mediaUrl(derivative.key));
		}
	}
	return [...byWidth.entries()]
		.sort(([left], [right]) => left - right)
		.map(([width, url]) => `${url} ${width}w`)
		.join(", ");
}

export function portfolioCluster(input: {
	galleryId: string;
	title: string;
	slug: string;
	placements: PortfolioClusterPlacement[];
}): GalleryCluster {
	return {
		id: input.galleryId,
		title: input.title || "untitled gallery",
		slug: input.slug,
		images: input.placements.map((placement) => {
			const random = seededRandom(seedFor(`${placement.key}:${placement.asset.assetId}`));
			const display = placement.asset.derivatives.display1280;
			return {
				src: mediaUrl(display.key),
				srcset: responsiveSources(placement.asset),
				alt: placement.decorative ? "" : (placement.altText?.trim() ?? ""),
				width: display.width,
				height: display.height,
				depth: 0.25 + random() * 0.65,
				offsetX: -38 + random() * 76,
				offsetY: -28 + random() * 56,
				rotation: -4.5 + random() * 9,
				scale: 0.82 + random() * 0.18,
			};
		}),
	};
}
