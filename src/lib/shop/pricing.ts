// Retail pricing for prints
// Cost data from LumaPrints + margin strategy from LUMAPRINTS.md

import { getSize, getWholesaleCost, V2_PAPERS } from "./printCatalog";
import type { PrintDimensions } from "./types";

/** Retail prices per paper type and size. Fallback data only; live products use Sanity variants. */
interface PriceEntry {
	retail: number;
}

/**
 * Pricing lookup table.
 * Key format: "{paperName}:{width}x{height}"
 */
const PRICE_TABLE: Record<string, PriceEntry> = {
	// Archival Matte (subcategory 103001)
	"Archival Matte:4x6": { retail: 15 },
	"Archival Matte:8x10": { retail: 35 },
	"Archival Matte:11x14": { retail: 55 },
	"Archival Matte:16x20": { retail: 85 },

	// Glossy (subcategory 103007)
	"Glossy:4x6": { retail: 18 },
	"Glossy:8x10": { retail: 40 },
	"Glossy:11x14": { retail: 60 },
	"Glossy:16x20": { retail: 95 },
};

function priceKey(paper: string, size: PrintDimensions): string {
	return `${paper}:${size.width}x${size.height}`;
}

/** Get the retail price for a paper + size combination */
export function getRetailPrice(paper: string, size: PrintDimensions): number | null {
	const entry = PRICE_TABLE[priceKey(paper, size)];
	return entry?.retail ?? null;
}

/** Get the cost (LumaPrints wholesale) for a paper + size */
export function getCost(paper: string, size: PrintDimensions): number | null {
	const paperSlug = V2_PAPERS.find((entry) => entry.name === paper)?.slug;
	const sizeSlug = getSize(`${size.width}x${size.height}`)?.slug;
	if (!paperSlug || !sizeSlug) return null;
	return getWholesaleCost(paperSlug, sizeSlug);
}

/** Get the profit margin for a paper + size */
export function getMargin(paper: string, size: PrintDimensions): number | null {
	const entry = PRICE_TABLE[priceKey(paper, size)];
	const cost = getCost(paper, size);
	if (!entry || cost === null) return null;
	return entry.retail - cost;
}

/** Get the starting (lowest) retail price across all papers and sizes */
export function getStartingPrice(): number {
	return Math.min(...Object.values(PRICE_TABLE).map((e) => e.retail));
}

/** Get the starting retail price for a specific paper type */
export function getStartingPriceForPaper(paper: string): number {
	const prices = Object.entries(PRICE_TABLE)
		.filter(([key]) => key.startsWith(paper))
		.map(([, entry]) => entry.retail);
	return Math.min(...prices);
}

/** Format price as USD string */
export function formatPrice(cents: number): string {
	return `$${cents.toFixed(0)}`;
}

/** Get all prices for display (paper x size matrix) */
export function getAllPrices(): {
	paper: string;
	width: number;
	height: number;
	sizeLabel: string;
	retail: number;
	cost: number;
}[] {
	return Object.entries(PRICE_TABLE).map(([key, entry]) => {
		const [paper, dims] = key.split(":");
		const [w, h] = dims.split("x").map(Number);
		return {
			paper,
			width: w,
			height: h,
			sizeLabel: `${w}×${h}`,
			retail: entry.retail,
			cost: getCost(paper, { width: w, height: h, label: `${w}×${h}` }) ?? 0,
		};
	});
}
