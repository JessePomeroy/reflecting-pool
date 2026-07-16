<script lang="ts">
import { MODELING_CATEGORY_IMAGE_LIMIT } from "$lib/config/modeling";
import type { ModelingGallery } from "$lib/server/sanity";

type OrbitSlot = {
	name: string;
	x: number;
	y: number;
	width: number;
	rotate: number;
	z: number;
};

let {
	heading,
	intro,
	galleries,
}: {
	heading: string;
	intro?: string;
	galleries: ModelingGallery[];
} = $props();

const standardSlots: OrbitSlot[] = [
	{ name: "hero", x: 36, y: 61, width: 23, rotate: -2, z: 7 },
	{ name: "top", x: 71, y: 30, width: 10.5, rotate: 4, z: 5 },
	{ name: "upper", x: 83, y: 40, width: 10, rotate: -5, z: 4 },
	{ name: "middle", x: 86, y: 55, width: 10.5, rotate: 3, z: 3 },
	{ name: "lower", x: 79, y: 70, width: 10, rotate: -4, z: 4 },
	{ name: "bottom", x: 67, y: 77, width: 10.5, rotate: 5, z: 5 },
];

const denseSlots: OrbitSlot[] = [
	{ name: "hero", x: 35, y: 61, width: 22, rotate: -2, z: 10 },
	{ name: "top-left", x: 65, y: 24, width: 10.5, rotate: 4, z: 6 },
	{ name: "top-center", x: 77, y: 25, width: 10.3, rotate: -4, z: 5 },
	{ name: "top-right", x: 89, y: 30, width: 10, rotate: 3, z: 4 },
	{ name: "middle-left", x: 64, y: 49, width: 10.3, rotate: -3, z: 5 },
	{ name: "middle-center", x: 77, y: 48, width: 10.2, rotate: 5, z: 6 },
	{ name: "middle-right", x: 90, y: 51, width: 9.8, rotate: -5, z: 4 },
	{ name: "lower-left", x: 64, y: 74, width: 10.2, rotate: 4, z: 4 },
	{ name: "lower-center", x: 77, y: 73, width: 10, rotate: -4, z: 5 },
	{ name: "lower-right", x: 90, y: 71, width: 9.6, rotate: 3, z: 3 },
];

let activeIndex = $state(0);
let activeGalleryIndex = $state(0);
let direction = $state<"next" | "prev">("next");

const activeGallery = $derived(galleries[activeGalleryIndex] ?? galleries[0]);
const images = $derived(activeGallery?.images ?? []);
const visibleCount = $derived(Math.min(images.length, MODELING_CATEGORY_IMAGE_LIMIT));
const visibleImages = $derived(images.slice(0, visibleCount));
const activeImage = $derived(visibleImages[activeIndex] ?? visibleImages[0]);
const activeSlots = $derived(visibleCount > standardSlots.length ? denseSlots : standardSlots);
const thumbnailScale = $derived(
	visibleCount <= standardSlots.length ? 1 : Math.max(0.775, 1 - (visibleCount - 7) * 0.075),
);

function getSlotWidth(slot: OrbitSlot) {
	return slot.name === "hero" ? slot.width : slot.width * thumbnailScale;
}

function getSlotIndex(imageIndex: number) {
	if (visibleCount === 0) return 0;
	return (imageIndex - activeIndex + visibleCount) % visibleCount;
}

function next() {
	if (visibleCount < 2) return;
	direction = "next";
	activeIndex = (activeIndex + 1) % visibleCount;
}

function previous() {
	if (visibleCount < 2) return;
	direction = "prev";
	activeIndex = (activeIndex - 1 + visibleCount) % visibleCount;
}

function selectGallery(index: number) {
	if (index === activeGalleryIndex) return;
	activeGalleryIndex = index;
	activeIndex = 0;
	direction = "next";
}
</script>

<section class="orbit-shell" aria-labelledby="modeling-heading">
	<div class="copy">
		<h1 id="modeling-heading">{heading}</h1>
		{#if intro}
			<p class="intro">{intro}</p>
		{/if}
	</div>

	{#if galleries.length > 1}
		<nav class="gallery-tabs" aria-label="Modeling gallery categories">
			{#each galleries as gallery, i (gallery.slug)}
				<button
					type="button"
					class:active={i === activeGalleryIndex}
					onclick={() => selectGallery(i)}
				>
					{gallery.title}
				</button>
			{/each}
		</nav>
	{/if}

	<div
		class="orbit-stage"
		data-density={visibleCount > standardSlots.length ? "dense" : "standard"}
		data-direction={direction}
	>
		{#each visibleImages as image, imageIndex (image.id)}
			{@const slot = activeSlots[getSlotIndex(imageIndex)]}
			<button
				type="button"
				class="orbit-photo"
				class:is-hero={slot.name === "hero"}
				class:is-active={image.id === activeImage?.id}
				style="
					--slot-x: {slot.x}%;
					--slot-y: {slot.y}%;
					--slot-width: {getSlotWidth(slot)}%;
					--slot-rotate: {slot.rotate}deg;
					--slot-z: {slot.z};
				"
				aria-label={image.id === activeImage?.id ? `${image.alt}, featured` : `Feature ${image.alt}`}
				onclick={slot.name === "hero" ? undefined : next}
			>
				<span class="photo-float">
					<img src={image.src} alt={image.alt} loading={slot.name === "hero" ? "eager" : "lazy"} />
				</span>
			</button>
		{/each}
	</div>

	<div class="orbit-controls" aria-label="Headshot gallery controls">
		<button type="button" onclick={previous} disabled={visibleCount < 2}>previous</button>
		<span>{activeIndex + 1} / {visibleCount}</span>
		<button type="button" onclick={next} disabled={visibleCount < 2}>next</button>
	</div>
</section>

<style>
	.orbit-shell {
		position: relative;
		z-index: 10;
		min-height: 100svh;
		padding: clamp(8.75rem, 17vh, 12rem) clamp(1.25rem, 4vw, 4rem) 4rem;
		color: rgba(var(--paper-rgb), 0.86);
		overflow: hidden;
	}

	.copy {
		position: absolute;
		left: 2.65rem;
		top: clamp(21rem, 52vh, 34rem);
		z-index: 8;
		width: min(330px, 24vw);
		pointer-events: none;
		text-shadow: 0 1px 18px rgba(var(--ink-rgb), 0.36);
	}

	.intro {
		margin: 0;
		font-family: var(--font-serif);
		font-weight: 300;
		color: rgba(var(--paper-rgb), 0.62);
	}

	.copy h1 {
		margin: 0 0 0.75rem;
		font-family: var(--font-serif);
		font-size: clamp(1.7rem, 2.8vw, 3.15rem);
		font-weight: 300;
		line-height: 0.96;
		letter-spacing: 0.08em;
		color: rgba(var(--paper-rgb), 0.9);
	}

	.intro {
		max-width: 31rem;
		font-size: clamp(0.95rem, 1.25vw, 1.12rem);
		line-height: 1.55;
	}

	.gallery-tabs {
		position: fixed;
		left: 2.65rem;
		bottom: clamp(1.25rem, 4vh, 2.4rem);
		z-index: 18;
		display: flex;
		flex-wrap: wrap;
		gap: 0.8rem;
		max-width: min(45rem, 48vw);
	}

	.gallery-tabs button {
		min-height: 44px;
		padding: 0.7rem 0;
		border: 0;
		border-bottom: 1px solid transparent;
		background: transparent;
		color: rgba(var(--paper-rgb), 0.5);
		font-family: var(--font-serif);
		font-size: 0.88rem;
		letter-spacing: 0.16em;
		text-transform: lowercase;
		cursor: pointer;
		transition:
			color 250ms ease,
			border-color 250ms ease;
	}

	.gallery-tabs button:hover,
	.gallery-tabs button.active {
		color: rgba(var(--paper-rgb), 0.88);
		border-color: rgba(var(--paper-rgb), 0.48);
	}

	.orbit-stage {
		position: absolute;
		inset: clamp(8.75rem, 17vh, 11.5rem) clamp(1.25rem, 3vw, 3rem) 5.25rem;
		z-index: 3;
	}

	.orbit-photo {
		position: absolute;
		top: var(--slot-y);
		left: var(--slot-x);
		z-index: var(--slot-z);
		width: var(--slot-width);
		aspect-ratio: 4 / 5;
		padding: 0;
		border: 0;
		border-radius: 2px;
		background: transparent;
		cursor: pointer;
		transform: translate(-50%, -50%) rotate(var(--slot-rotate));
		transition:
			top 980ms cubic-bezier(0.2, 0.85, 0.18, 1),
			left 980ms cubic-bezier(0.2, 0.85, 0.18, 1),
			width 980ms cubic-bezier(0.2, 0.85, 0.18, 1),
			transform 980ms cubic-bezier(0.2, 0.85, 0.18, 1),
			filter 980ms ease,
			opacity 420ms ease;
	}

	.orbit-photo:focus-visible {
		outline: 1px solid rgba(var(--paper-rgb), 0.95);
		outline-offset: 8px;
	}

	.photo-float {
		display: block;
		width: 100%;
		height: 100%;
		border: 1px solid rgba(var(--paper-rgb), 0.28);
		border-radius: 2px;
		box-shadow: 0 20px 45px rgba(var(--ink-rgb), 0.28);
		overflow: hidden;
		background: rgba(var(--paper-rgb), 0.08);
		animation: photoDrift 8s ease-in-out infinite;
		animation-delay: calc(var(--slot-z) * -480ms);
	}

	.orbit-photo.is-hero .photo-float {
		box-shadow: 0 30px 70px rgba(var(--ink-rgb), 0.38);
	}

	.orbit-photo.is-hero {
		cursor: default;
	}

	.orbit-photo img {
		width: 100%;
		height: 100%;
		display: block;
		object-fit: cover;
		filter: saturate(0.95) contrast(1.02);
	}

	.orbit-photo:not(.is-hero) img {
		filter: saturate(0.82) contrast(0.95) brightness(0.88);
	}

	.orbit-controls {
		position: fixed;
		right: clamp(1.4rem, 3vw, 3rem);
		bottom: clamp(1.25rem, 4vh, 2.4rem);
		z-index: 18;
		display: flex;
		align-items: center;
		gap: 0.85rem;
		font-family: var(--font-serif);
		color: rgba(var(--paper-rgb), 0.76);
	}

	.orbit-controls button {
		min-height: 44px;
		padding: 0.7rem 1.05rem;
		border: 1px solid rgba(var(--paper-rgb), 0.34);
		border-radius: 0;
		background: rgba(var(--ink-rgb), 0.18);
		color: rgba(var(--paper-rgb), 0.82);
		font-family: var(--font-serif);
		font-size: 0.86rem;
		letter-spacing: 0.16em;
		text-transform: lowercase;
		cursor: pointer;
		transition:
			background 250ms ease,
			color 250ms ease,
			border-color 250ms ease;
	}

	.orbit-controls button:hover:not(:disabled) {
		background: rgba(var(--paper-rgb), 0.12);
		border-color: rgba(var(--paper-rgb), 0.65);
		color: rgba(var(--paper-rgb), 0.96);
	}

	.orbit-controls button:disabled {
		opacity: 0.42;
		cursor: default;
	}

	.orbit-controls span {
		min-width: 3.5rem;
		text-align: center;
		letter-spacing: 0.14em;
	}

	@keyframes photoDrift {
		0%,
		100% {
			transform: translate3d(0, 0, 0);
		}
		50% {
			transform: translate3d(0.25rem, -0.45rem, 0);
		}
	}

	@media (max-width: 900px) {
		.orbit-shell {
			padding-top: 7rem;
			overflow: hidden;
		}

		.copy {
			left: 1.4rem;
			top: 10rem;
			width: min(24rem, calc(100vw - 2.8rem));
		}

		.orbit-stage {
			inset: 13.5rem 0.8rem 5.5rem;
		}

		.orbit-photo {
			width: calc(var(--slot-width) * 1.55);
		}

		.orbit-stage[data-density="dense"] .orbit-photo {
			width: calc(var(--slot-width) * 1.28);
		}
	}

	@media (max-width: 640px) {
		.orbit-shell {
			min-height: auto;
			padding: 0;
			overflow: visible;
		}

		.copy {
			position: fixed;
			inset: auto 1.25rem 1.65rem auto;
			z-index: 18;
			width: min(13rem, 55vw);
			text-align: right;
		}

		.copy h1 {
			margin: 0;
			font-size: clamp(1.1rem, 6vw, 1.45rem);
			line-height: 1.05;
			letter-spacing: 0.16em;
		}

		.intro {
			display: none;
		}

		.gallery-tabs {
			position: fixed;
			left: 1rem;
			right: auto;
			bottom: 1.1rem;
			z-index: 18;
			flex-direction: column;
			align-items: flex-start;
			gap: 0.15rem;
			max-width: min(11rem, 40vw);
		}

		.gallery-tabs button {
			min-height: 36px;
			padding: 0.25rem 0;
			font-size: 0.72rem;
			letter-spacing: 0.14em;
			text-align: left;
		}

		.orbit-stage {
			position: relative;
			inset: auto;
			display: flex;
			flex-direction: column;
			align-items: center;
			gap: 8rem;
			min-height: 100svh;
			padding: 28vh 1rem 7rem;
		}

		.orbit-photo,
		.orbit-stage[data-density="dense"] .orbit-photo {
			position: relative;
			top: auto;
			left: auto;
			width: clamp(205px, 70vw, 310px);
			flex-shrink: 0;
			transform: rotate(var(--slot-rotate));
			transition:
				transform 400ms ease,
				filter 400ms ease;
		}

		.orbit-photo.is-hero,
		.orbit-stage[data-density="dense"] .orbit-photo.is-hero {
			width: clamp(220px, 74vw, 330px);
			transform: rotate(var(--slot-rotate)) scale(1.04);
			filter: drop-shadow(0 8px 24px rgba(var(--ink-rgb), 0.34));
		}

		.orbit-photo:nth-child(odd) {
			align-self: flex-start;
			margin-left: 8vw;
		}

		.orbit-photo:nth-child(even) {
			align-self: flex-end;
			margin-right: 8vw;
		}

		.orbit-controls {
			display: none;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.orbit-photo,
		.photo-float,
		.orbit-controls button {
			transition: none;
			animation: none;
		}
	}
</style>
