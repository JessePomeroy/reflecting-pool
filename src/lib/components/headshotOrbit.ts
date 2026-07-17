import { MODELING_CATEGORY_IMAGE_LIMIT } from "$lib/config/modeling";

export type OrbitSlot = {
	name: "hero" | "orbit";
	x: number;
	y: number;
	mobileX: number;
	mobileY: number;
	width: number;
	mobileWidth: number;
	rotate: number;
	z: number;
	opacity: number;
};

function pointOnEllipse(
	angle: number,
	centerX: number,
	centerY: number,
	radiusX: number,
	radiusY: number,
) {
	return {
		x: centerX + Math.cos(angle) * radiusX,
		y: centerY + Math.sin(angle) * radiusY,
	};
}

/**
 * Places every image on the same ellipse. Slot zero is enlarged into the
 * focal position; changing the active image rotates the remaining images
 * through the neighboring slots instead of switching to a dense grid.
 */
export function createHeadshotOrbitSlots(imageCount: number): OrbitSlot[] {
	const count = Math.min(Math.max(Math.trunc(imageCount), 0), MODELING_CATEGORY_IMAGE_LIMIT);
	if (count === 0) return [];

	const thumbnailWidth = Math.max(9, 11.8 - Math.max(0, count - 6) * 0.7);
	const mobileThumbnailWidth = Math.max(14, 18 - Math.max(0, count - 6));

	return Array.from({ length: count }, (_, index) => {
		const angle = Math.PI + (index / count) * Math.PI * 2;
		const desktop = pointOnEllipse(angle, 68, 54, 28, 30);
		const mobile = pointOnEllipse(angle, 60, 49, 30, 31);
		const isHero = index === 0;
		const depth = (Math.cos(angle) + 1) / 2;

		return {
			name: isHero ? "hero" : "orbit",
			x: desktop.x,
			y: desktop.y,
			mobileX: mobile.x,
			mobileY: mobile.y,
			width: isHero ? 23 : thumbnailWidth * (0.86 + depth * 0.14),
			mobileWidth: isHero ? 45 : mobileThumbnailWidth * (0.86 + depth * 0.14),
			rotate: isHero ? -2 : Math.sin(angle) * -5,
			z: isHero ? 20 : 3 + Math.round(depth * 6),
			opacity: isHero ? 1 : 0.7 + depth * 0.25,
		};
	});
}
