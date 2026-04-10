/**
 * Shared click-ripple physics for pushing elements away from clicks.
 *
 * Two modes:
 * - "spring": elements bounce back (clusters)
 * - "drift": elements float away with friction (leaves)
 */

export interface RippleConfig {
	mode: "spring" | "drift";
	/** Max distance (% of viewport) to affect an element */
	maxDist: number;
	/** Initial push strength in px */
	strength: number;
	/** Friction/damping per frame (0.9–0.99) */
	damping: number;
	/** Spring stiffness — only used in "spring" mode */
	spring: number;
}

export const CLUSTER_RIPPLE: RippleConfig = {
	mode: "spring",
	maxDist: 60,
	strength: 18,
	damping: 0.92,
	spring: 0.012,
};

export const LEAF_RIPPLE: RippleConfig = {
	mode: "drift",
	maxDist: 30,
	strength: 3,
	damping: 0.985,
	spring: 0,
};

export interface Vec2 {
	x: number;
	y: number;
}

/**
 * Create a ripple system for N elements.
 */
export function createRippleSystem(count: number) {
	const push: Vec2[] = Array.from({ length: count }, () => ({ x: 0, y: 0 }));
	const vel: Vec2[] = Array.from({ length: count }, () => ({ x: 0, y: 0 }));

	return { push, vel };
}

/**
 * Apply a click impulse to nearby elements.
 * @param clickX - click position in % of viewport width
 * @param clickY - click position in % of viewport height
 * @param positions - element positions (x/y as % of viewport)
 * @param vel - velocity array to mutate
 * @param config - ripple configuration
 */
export function applyClickImpulse(
	clickX: number,
	clickY: number,
	positions: Array<{ x: number; y: number }>,
	vel: Vec2[],
	config: RippleConfig,
) {
	for (let i = 0; i < positions.length; i++) {
		const pos = positions[i];
		if (!pos || !vel[i]) continue;

		const dx = pos.x - clickX;
		const dy = pos.y - clickY;
		const dist = Math.sqrt(dx * dx + dy * dy);

		if (dist > config.maxDist || dist < 0.5) continue;

		const strength = (1 - dist / config.maxDist) * config.strength;
		const angle = Math.atan2(dy, dx);

		vel[i].x += Math.cos(angle) * strength;
		vel[i].y += Math.sin(angle) * strength;
	}
}

/**
 * Step the ripple physics one frame.
 * @returns true if any element is still moving (needs re-render)
 */
export function stepRipple(push: Vec2[], vel: Vec2[], config: RippleConfig): boolean {
	let anyMoving = false;
	const threshold = config.mode === "drift" ? 0.005 : 0.01;

	for (let i = 0; i < vel.length; i++) {
		if (!push[i] || !vel[i]) continue;

		push[i].x += vel[i].x;
		push[i].y += vel[i].y;

		vel[i].x *= config.damping;
		vel[i].y *= config.damping;

		// Spring mode: pull back toward origin
		if (config.mode === "spring") {
			vel[i].x -= push[i].x * config.spring;
			vel[i].y -= push[i].y * config.spring;
		}

		if (Math.abs(vel[i].x) > threshold || Math.abs(vel[i].y) > threshold) {
			anyMoving = true;
		}
	}

	return anyMoving;
}

/**
 * Snapshot push state for reactive output (creates new array to trigger Svelte reactivity).
 */
export function snapshotPush(push: Vec2[]): Vec2[] {
	return push.map((p) => ({ x: p.x, y: p.y }));
}
