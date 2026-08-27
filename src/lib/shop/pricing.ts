// Retail pricing for prints
// Cost data from LumaPrints + margin strategy from LUMAPRINTS.md

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

/** Get the starting (lowest) retail price across all papers and sizes */
export function getStartingPrice(): number {
	return Math.min(...Object.values(PRICE_TABLE).map((e) => e.retail));
}

/** Format price as USD string */
export function formatPrice(cents: number): string {
	return `$${cents.toFixed(0)}`;
}
