import type { ClusterImage, GalleryCluster } from "$lib/types/gallery";

function seededRandom(seed: number): () => number {
	let s = seed;
	return () => {
		s = (s * 16807 + 0) % 2147483647;
		return s / 2147483647;
	};
}

function makeImage(num: string, title: string): ClusterImage {
	const rand = seededRandom(parseInt(num, 10));
	return {
		src: `/images/flower-${num}.jpg`,
		alt: `${title} — flower ${num}`,
		depth: 0.25 + rand() * 0.65,
		offsetX: -38 + rand() * 76,
		offsetY: -28 + rand() * 56,
		rotation: -4.5 + rand() * 9,
		scale: 0.82 + rand() * 0.18,
	};
}

function makeCluster(id: string, title: string, slug: string, nums: string[]): GalleryCluster {
	return { id, title, slug, images: nums.map((n) => makeImage(n, title)) };
}

export const clusters: GalleryCluster[] = [
	makeCluster("wildflowers", "Wildflowers", "wildflowers", [
		"01",
		"02",
		"03",
		"04",
		"05",
		"06",
		"07",
	]),
	makeCluster("garden-portraits", "Garden Portraits", "garden-portraits", [
		"08",
		"09",
		"10",
		"11",
		"13",
	]),
	makeCluster("close-ups", "Close-ups", "close-ups", ["14", "15", "16", "17", "18", "19", "20"]),
	makeCluster("moody-blooms", "Moody Blooms", "moody-blooms", ["21", "22", "24", "25", "26", "27"]),
	makeCluster("panoramic", "Panoramic", "panoramic", [
		"28",
		"29",
		"30",
		"31",
		"32",
		"33",
		"34",
		"35",
	]),
];
