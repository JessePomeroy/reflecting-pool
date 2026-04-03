// TypeScript interfaces for the Reflecting Pool gallery

export interface GalleryImage {
	src: string;
	alt: string;
	width?: number;
	height?: number;
	depth: number; // 0.1 to 1.0
}

export interface ClusterImage extends GalleryImage {
	offsetX: number; // offset from cluster center (px)
	offsetY: number;
	rotation: number; // degrees (-5 to 5)
	scale: number; // 0.8-1.0
}

export interface GalleryCluster {
	id: string;
	title: string;
	slug: string;
	images: ClusterImage[];
}

export interface GalleryPosition {
	x: number; // percentage from left
	y: number; // percentage from top
	depth: number;
	rotation: number;
	scale: number;
}

export interface Ripple {
	id: number;
	x: number; // px
	y: number; // px
	startTime: number;
}

export interface FloatingLeaf {
	id: number;
	src: string;
	x: number; // percentage
	y: number; // percentage
	depth: number;
	scale: number;
	spinDuration: number; // seconds
	spinReverse: boolean;
	driftDuration: number;
	driftDelay: number;
	floatDuration: number;
	floatDelay: number;
	blownAway: boolean;
}

export interface ParallaxContext {
	readonly smoothX: number; // normalized -1 to 1
	readonly smoothY: number;
	readonly smoothPixelX: number;
	readonly smoothPixelY: number;
	readonly isTouch: boolean;
	readonly isMobile: boolean;
	readonly isLowEnd: boolean;
	readonly tick: number;
	addRipple: (x: number, y: number) => void;
}
