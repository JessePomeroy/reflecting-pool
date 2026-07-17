import { type PortfolioClusterAsset, portfolioCluster } from "$lib/server/content/portfolioCluster";

interface PreviewPlacement {
	key: string;
	altText?: string | null;
	assetId: string;
}

interface PreviewAsset {
	_id: string;
	assetId: PortfolioClusterAsset["assetId"];
	derivatives: PortfolioClusterAsset["derivatives"];
}

export function portfolioDraftPreviewCluster(input: {
	galleryId: string;
	title: string;
	slug: string;
	placements: PreviewPlacement[];
	assets: PreviewAsset[];
}) {
	const assets = new Map(input.assets.map((asset) => [asset._id, asset]));
	return portfolioCluster({
		galleryId: input.galleryId,
		title: input.title || "untitled gallery",
		slug: input.slug,
		placements: input.placements.map((placement) => {
			const asset = assets.get(placement.assetId);
			if (!asset) throw new Error("Preview media asset is unavailable");
			return {
				...placement,
				asset,
			};
		}),
	});
}
