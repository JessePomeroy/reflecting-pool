// Retail pricing for prints
// Cost data from LumaPrints + margin strategy from LUMAPRINTS.md

import type { PaperType, PrintDimensions } from "./types";

/** Cost and retail prices per paper type and size */
interface PriceEntry {
	cost: number;
	retail: number;
}

/**
 * Pricing lookup table.
 * Key format: "{paperType}:{width}x{height}"
 */
const PRICE_TABLE: Record<string, PriceEntry> = {
	// Archival Matte (subcategory 103001)
	"Archival Matte:4x6": { cost: 1.71, retail: 15 },
	"Archival Matte:8x10": { cost: 3.19, retail: 35 },
	"Archival Matte:11x14": { cost: 5.5, retail: 55 },
	"Archival Matte:16x20": { cost: 8.5, retail: 85 },

	// Glossy (subcategory 103007)
	"Glossy:4x6": { cost: 3.02, retail: 18 },
	"Glossy:8x10": { cost: 5.09, retail: 40 },
	"Glossy:11x14": { cost: 7.2, retail: 60 },
	"Glossy:16x20": { cost: 10.2, retail: 95 },
};

function priceKey(paper: PaperType, size: PrintDimensions): string {
	return `${paper}:${size.width}x${size.height}`;
}

/** Get the retail price for a paper + size combination */
export function getRetailPrice(paper: PaperType, size: PrintDimensions): number | null {
	const entry = PRICE_TABLE[priceKey(paper, size)];
	return entry?.retail ?? null;
}

/** Get the cost (LumaPrints wholesale) for a paper + size */
export function getCost(paper: PaperType, size: PrintDimensions): number | null {
	const entry = PRICE_TABLE[priceKey(paper, size)];
	return entry?.cost ?? null;
}

/** Get the profit margin for a paper + size */
export function getMargin(paper: PaperType, size: PrintDimensions): number | null {
	const entry = PRICE_TABLE[priceKey(paper, size)];
	if (!entry) return null;
	return entry.retail - entry.cost;
}

/** Get the starting (lowest) retail price across all papers and sizes */
export function getStartingPrice(): number {
	return Math.min(...Object.values(PRICE_TABLE).map((e) => e.retail));
}

/** Get the starting retail price for a specific paper type */
export function getStartingPriceForPaper(paper: PaperType): number {
	const prices = Object.entries(PRICE_TABLE)
		.filter(([key]) => key.startsWith(paper))
		.map(([, entry]) => entry.retail);
	return Math.min(...prices);
}

/** Format price as USD string */
export function formatPrice(cents: number): string {
	return `$${cents.toFixed(0)}`;
}

/** Get all prices for display (paper × size matrix) */
export function getAllPrices(): {
	paper: PaperType;
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
			paper: paper as PaperType,
			width: w,
			height: h,
			sizeLabel: `${w}×${h}`,
			retail: entry.retail,
			cost: entry.cost,
		};
	});
}
