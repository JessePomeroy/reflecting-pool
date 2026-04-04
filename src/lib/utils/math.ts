// Math utilities for parallax, animation, and position generation

/** Linear interpolation between a and b by t (0-1) */
export function lerp(a: number, b: number, t: number): number {
	return a + (b - a) * t;
}

/** Clamp value between min and max */
export function clamp(value: number, min: number, max: number): number {
	return Math.min(Math.max(value, min), max);
}

/** Normalize value from [inMin, inMax] to [outMin, outMax] */
export function normalize(
	value: number,
	inMin: number,
	inMax: number,
	outMin: number = 0,
	outMax: number = 1
): number {
	const t = (value - inMin) / (inMax - inMin);
	return outMin + (outMax - outMin) * clamp(t, 0, 1);
}

/** Ease-out cubic: decelerating to zero velocity */
export function easeOutCubic(t: number): number {
	return 1 - Math.pow(1 - t, 3);
}

/** Ease-in cubic: accelerating from zero velocity */
export function easeInCubic(t: number): number {
	return t * t * t;
}

/** Ease-in-out cubic */
export function easeInOutCubic(t: number): number {
	return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

/** Distance between two points */
export function distance(x1: number, y1: number, x2: number, y2: number): number {
	return Math.hypot(x2 - x1, y2 - y1);
}

/** Random float between min and max */
export function randomRange(min: number, max: number): number {
	return min + Math.random() * (max - min);
}

/** Random integer between min and max (inclusive) */
export function randomInt(min: number, max: number): number {
	return Math.floor(randomRange(min, max + 1));
}

/**
 * Generate scattered positions within a region with collision avoidance.
 * Returns an array of { x, y } positions (in percentages).
 */
export function generateScatteredPositions(
	count: number,
	bounds: { minX: number; maxX: number; minY: number; maxY: number },
	minDistance: number = 10,
	maxAttempts: number = 100
): Array<{ x: number; y: number }> {
	const positions: Array<{ x: number; y: number }> = [];

	for (let i = 0; i < count; i++) {
		let bestPos = { x: 0, y: 0 };
		let bestMinDist = -1;

		for (let attempt = 0; attempt < maxAttempts; attempt++) {
			const x = randomRange(bounds.minX, bounds.maxX);
			const y = randomRange(bounds.minY, bounds.maxY);

			if (positions.length === 0) {
				bestPos = { x, y };
				break;
			}

			let closestDist = Infinity;
			for (const pos of positions) {
				const d = distance(x, y, pos.x, pos.y);
				closestDist = Math.min(closestDist, d);
			}

			if (closestDist > bestMinDist) {
				bestMinDist = closestDist;
				bestPos = { x, y };
			}

			if (closestDist >= minDistance) break;
		}

		positions.push(bestPos);
	}

	return positions;
}

/**
 * Generate cluster grid positions with jitter.
 * Divides the space into a grid and places items at grid centers with random offset.
 */
export function generateClusterPositions(
	count: number,
	jitter: number = 15, isMobile: boolean = false
): Array<{ x: number; y: number }> {
	// Determine grid dimensions
	const cols = Math.ceil(Math.sqrt(count * 1.5));
	const rows = Math.ceil(count / cols);

	const cellW = 80 / cols; // 80% of viewport (10% margin each side)
	// On mobile, push clusters lower to avoid title overlap
	
	const topOffset = isMobile ? 50 : 35;
	const minY = isMobile ? 45 : 32;
	// Mobile: single column, spaced so ~2 visible + 1 peeking (each ~35% of viewport)
	const cellH = (isMobile ? 35 : 60) / rows;

	const positions: Array<{ x: number; y: number }> = [];
	let idx = 0;

	for (let r = 0; r < rows && idx < count; r++) {
		for (let c = 0; c < cols && idx < count; c++) {
			const cx = 10 + cellW * (c + 0.5) + randomRange(-jitter, jitter);
			const cy = topOffset + cellH * (r + 0.5) + randomRange(-jitter, jitter);
			positions.push({
				x: clamp(cx, 8, 92),
				y: clamp(cy, minY, 88)
			});
			idx++;
		}
	}

	return positions;
}
