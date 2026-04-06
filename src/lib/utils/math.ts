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
	outMax: number = 1,
): number {
	const t = (value - inMin) / (inMax - inMin);
	return outMin + (outMax - outMin) * clamp(t, 0, 1);
}

/** Ease-out cubic: decelerating to zero velocity */
export function easeOutCubic(t: number): number {
	return 1 - (1 - t) ** 3;
}

/** Ease-in cubic: accelerating from zero velocity */
export function easeInCubic(t: number): number {
	return t * t * t;
}

/** Ease-in-out cubic */
export function easeInOutCubic(t: number): number {
	return t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
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
	maxAttempts: number = 100,
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
 *
 * NOTE: This is the legacy fixed-jitter version that can produce overlapping
 * clusters. Prefer `generateNonOverlappingClusterPositions` for the cluster field.
 */
export function generateClusterPositions(
	count: number,
	jitter: number = 15,
	isMobile: boolean = false,
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
				y: clamp(cy, minY, 88),
			});
			idx++;
		}
	}

	return positions;
}

/**
 * Generate non-overlapping cluster positions (in viewport %).
 *
 * Strategy: place items on a grid with jitter that's *mathematically bounded*
 * by the actual cluster footprint + runtime motion budget, so adjacent cells
 * can never overlap. A relaxation pass handles residual edge cases (dense
 * counts, anisotropic viewports) by pushing overlapping pairs apart.
 *
 * All size inputs are in **pixels**; bounds and output are in **viewport %**.
 */
export function generateNonOverlappingClusterPositions(opts: {
	count: number;
	viewportW: number;
	viewportH: number;
	/** Cluster footprint in px (width × height of hit area) */
	clusterW: number;
	clusterH: number;
	/** Per-axis runtime motion amplitude in px (wander + parallax peak) */
	motionBudget?: number;
	/** Extra gap between clusters in px */
	gap?: number;
	/** Field bounds in viewport % */
	bounds?: { minX: number; maxX: number; minY: number; maxY: number };
}): Array<{ x: number; y: number }> {
	const {
		count,
		viewportW,
		viewportH,
		clusterW,
		clusterH,
		motionBudget = 32,
		gap = 12,
		bounds = { minX: 10, maxX: 90, minY: 34, maxY: 94 },
	} = opts;

	if (count === 0) return [];

	// Minimum center-to-center separation (axis-aligned): full cluster size +
	// 2× motion (each cluster can drift) + gap
	const sepX = clusterW + 2 * motionBudget + gap;
	const sepY = clusterH + 2 * motionBudget + gap;

	// Hard bounds we'll never cross (leaves room for header/chrome)
	const HARD_MIN_Y_PCT = 14;
	const HARD_MAX_Y_PCT = 98;
	const HARD_MIN_X_PCT = 6;
	const HARD_MAX_X_PCT = 94;

	// Start with requested bounds, convert to px
	let minX = (bounds.minX / 100) * viewportW;
	let maxX = (bounds.maxX / 100) * viewportW;
	let minY = (bounds.minY / 100) * viewportH;
	let maxY = (bounds.maxY / 100) * viewportH;

	// Aspect-aware grid shape
	let fieldW = Math.max(1, maxX - minX);
	let fieldH = Math.max(1, maxY - minY);
	const aspect = fieldW / fieldH;
	let cols = Math.max(1, Math.round(Math.sqrt(count * aspect)));
	let rows = Math.ceil(count / cols);

	// If the field can't contain the required grid, expand bounds toward
	// the hard limits. Preserves the requested bounds on roomy viewports
	// and gracefully spills outward on tight ones.
	const needW = cols * sepX;
	const needH = rows * sepY;
	if (needW > fieldW) {
		const extra = Math.min(
			needW - fieldW,
			((HARD_MAX_X_PCT - HARD_MIN_X_PCT) / 100) * viewportW - fieldW,
		);
		minX = Math.max((HARD_MIN_X_PCT / 100) * viewportW, minX - extra / 2);
		maxX = Math.min((HARD_MAX_X_PCT / 100) * viewportW, maxX + extra / 2);
	}
	if (needH > fieldH) {
		const extra = Math.min(
			needH - fieldH,
			((HARD_MAX_Y_PCT - HARD_MIN_Y_PCT) / 100) * viewportH - fieldH,
		);
		// Prefer to expand downward first (header stays put), then upward
		const expandDown = Math.min(extra, (HARD_MAX_Y_PCT / 100) * viewportH - maxY);
		maxY += expandDown;
		const remaining = extra - expandDown;
		if (remaining > 0) {
			minY = Math.max((HARD_MIN_Y_PCT / 100) * viewportH, minY - remaining);
		}
	}
	fieldW = Math.max(1, maxX - minX);
	fieldH = Math.max(1, maxY - minY);
	// Bump cols/rows if cells would be too small for the cluster footprint
	while (cols > 1 && fieldW / cols < sepX && rows * (cols - 1) >= count) {
		// shrinking cols wouldn't help, skip
		break;
	}
	while (fieldW / cols < sepX && cols * (rows + 1) >= count && rows < count) {
		// try fewer cols, more rows
		if (cols <= 1) break;
		cols--;
		rows = Math.ceil(count / cols);
	}
	while (fieldH / rows < sepY && (rows - 1) * cols >= count && rows > 1) {
		rows--;
		cols = Math.ceil(count / rows);
	}

	const cellW = fieldW / cols;
	const cellH = fieldH / rows;

	// Bounded jitter — guarantees non-overlap with 4-neighbors even at extremes
	const jitterX = Math.max(0, (cellW - sepX) / 2);
	const jitterY = Math.max(0, (cellH - sepY) / 2);

	// Place on grid with bounded jitter, shuffling cell assignments so the
	// visual isn't a strict row-major march
	const cellIndices: number[] = [];
	for (let i = 0; i < rows * cols; i++) cellIndices.push(i);
	// Fisher-Yates shuffle
	for (let i = cellIndices.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[cellIndices[i], cellIndices[j]] = [cellIndices[j], cellIndices[i]];
	}

	const positions: Array<{ x: number; y: number }> = [];
	for (let i = 0; i < count; i++) {
		const cellIdx = cellIndices[i];
		const c = cellIdx % cols;
		const r = Math.floor(cellIdx / cols);
		const x = minX + cellW * (c + 0.5) + randomRange(-jitterX, jitterX);
		const y = minY + cellH * (r + 0.5) + randomRange(-jitterY, jitterY);
		positions.push({ x, y });
	}

	// Relaxation: safety net for edge cases (anisotropic cells, odd counts,
	// or cases where the grid geometry can't fully respect sepX/sepY).
	// O(n² × iterations) — scale iteration count with cluster count. For
	// typical small galleries (n ≤ 12) this is trivial; caps at 40 for
	// larger fields.
	const iterations = Math.min(40, Math.max(12, count * 4));
	relaxPositions(positions, sepX, sepY, minX, maxX, minY, maxY, iterations);

	// Convert px → viewport %
	return positions.map((p) => ({
		x: (p.x / viewportW) * 100,
		y: (p.y / viewportH) * 100,
	}));
}

/**
 * Iteratively push overlapping positions apart (anisotropic — uses an
 * elliptical separation test so rectangular footprints are respected).
 * Mutates the input array in place.
 */
function relaxPositions(
	positions: Array<{ x: number; y: number }>,
	sepX: number,
	sepY: number,
	minX: number,
	maxX: number,
	minY: number,
	maxY: number,
	iterations: number,
): void {
	const n = positions.length;
	if (n < 2) return;

	for (let iter = 0; iter < iterations; iter++) {
		let moved = false;
		for (let i = 0; i < n; i++) {
			for (let j = i + 1; j < n; j++) {
				const a = positions[i];
				const b = positions[j];
				let dx = b.x - a.x;
				let dy = b.y - a.y;
				// Normalize by separation → unit ellipse; overlap if |v| < 1
				const nx = dx / sepX;
				const ny = dy / sepY;
				const distSq = nx * nx + ny * ny;
				if (distSq >= 1) continue;
				moved = true;
				if (distSq < 1e-6) {
					// coincident — pick a deterministic nudge
					dx = sepX * 0.5;
					dy = 0;
				} else {
					const dist = Math.sqrt(distSq);
					// Push apart to the ellipse boundary (plus a small epsilon)
					const push = (1 - dist) * 0.55;
					dx = (nx / dist) * sepX * push;
					dy = (ny / dist) * sepY * push;
				}
				a.x -= dx * 0.5;
				a.y -= dy * 0.5;
				b.x += dx * 0.5;
				b.y += dy * 0.5;
			}
		}
		// Clamp to field bounds
		for (const p of positions) {
			p.x = clamp(p.x, minX, maxX);
			p.y = clamp(p.y, minY, maxY);
		}
		if (!moved) break;
	}
}
