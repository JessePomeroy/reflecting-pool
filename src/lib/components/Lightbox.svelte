<script lang="ts">
import type { ClusterImage } from "$lib/types/gallery";

interface Props {
	src: string;
	currentIndex: number;
	images: ClusterImage[];
	onclose: () => void;
}

let { src, currentIndex, images, onclose }: Props = $props();

let index = $state(0);
$effect.pre(() => {
	index = currentIndex;
});
let visible = $state(false);
let currentSrc = $derived(images[index]?.src ?? src);

// DOM refs for focus management
let dialogEl = $state<HTMLDivElement | undefined>(undefined);
let previouslyFocused: HTMLElement | null = null;

// Touch swipe tracking
let touchStartX = 0;

function next() {
	if (index < images.length - 1) index++;
}

function prev() {
	if (index > 0) index--;
}

function handleKeydown(e: KeyboardEvent) {
	if (e.key === "Escape") {
		onclose();
		return;
	}
	if (e.key === "ArrowRight") next();
	if (e.key === "ArrowLeft") prev();
	// Focus trap — confine Tab cycles within the dialog's focusable elements
	if (e.key === "Tab" && dialogEl) {
		const focusables = dialogEl.querySelectorAll<HTMLElement>(
			"button:not([disabled]), [href], [tabindex]:not([tabindex='-1'])",
		);
		if (focusables.length === 0) return;
		const first = focusables[0];
		const last = focusables[focusables.length - 1];
		const active = document.activeElement as HTMLElement | null;
		if (e.shiftKey && active === first) {
			e.preventDefault();
			last.focus();
		} else if (!e.shiftKey && active === last) {
			e.preventDefault();
			first.focus();
		}
	}
}

function handleTouchStart(e: TouchEvent) {
	touchStartX = e.touches[0].clientX;
}

function handleTouchEnd(e: TouchEvent) {
	const diff = e.changedTouches[0].clientX - touchStartX;
	if (Math.abs(diff) > 50) {
		if (diff > 0) prev();
		else next();
	}
}

$effect(() => {
	// Remember what was focused before opening so we can restore it on close
	previouslyFocused = document.activeElement as HTMLElement | null;
	requestAnimationFrame(() => {
		visible = true;
		dialogEl?.focus();
	});
	return () => {
		previouslyFocused?.focus();
	};
});
</script>

<svelte:window onkeydown={handleKeydown} />

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
	bind:this={dialogEl}
	class="lightbox"
	class:visible
	onclick={onclose}
	ontouchstart={handleTouchStart}
	ontouchend={handleTouchEnd}
	role="dialog"
	aria-modal="true"
	aria-label="Image viewer"
	tabindex="0"
>
	<div class="lightbox-overlay"></div>

	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div class="lightbox-content" onclick={(e) => e.stopPropagation()}>
		<img src={currentSrc} alt="" role="presentation" class="lightbox-image" />
	</div>

	<div class="lightbox-controls">
		<button class="nav-btn prev" onclick={(e) => { e.stopPropagation(); prev(); }} disabled={index === 0} aria-label="Previous image">
			‹
		</button>
		<span class="counter" aria-live="polite">{index + 1} / {images.length}</span>
		<button class="nav-btn next" onclick={(e) => { e.stopPropagation(); next(); }} disabled={index === images.length - 1} aria-label="Next image">
			›
		</button>
	</div>

	<button class="close-btn" onclick={onclose} aria-label="Close image viewer">×</button>
</div>

<style>
	.lightbox {
		position: fixed;
		inset: 0;
		z-index: 100;
		display: flex;
		align-items: center;
		justify-content: center;
		opacity: 0;
	}

	.lightbox.visible {
		opacity: 1;
	}

	@media (prefers-reduced-motion: no-preference) {
		.lightbox {
			transition: opacity 500ms ease;
		}
	}

	.lightbox-overlay {
		position: absolute;
		inset: 0;
		background: rgba(10, 12, 18, 0.96);
	}

	.lightbox-content {
		position: relative;
		z-index: 1;
		max-width: 90vw;
		max-height: 85vh;
	}

	.lightbox-image {
		display: block;
		max-width: 90vw;
		max-height: 85vh;
		object-fit: contain;
		border-radius: 2px;
		box-shadow: 0 8px 40px rgba(0, 0, 0, 0.5);
	}

	.lightbox-controls {
		position: fixed;
		bottom: 2rem;
		left: 50%;
		transform: translateX(-50%);
		z-index: 2;
		display: flex;
		align-items: center;
		gap: 1.5rem;
	}

	.nav-btn {
		background: none;
		border: 1px solid rgba(var(--paper-rgb), 0.2);
		color: rgba(var(--paper-rgb), 0.7);
		font-size: 1.5rem;
		width: 44px;
		height: 44px;
		border-radius: 50%;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		transition:
			border-color 300ms ease,
			color 300ms ease;
	}

	.nav-btn:hover:not(:disabled) {
		border-color: rgba(var(--paper-rgb), 0.5);
		color: rgba(var(--paper-rgb), 1);
	}

	.nav-btn:disabled {
		opacity: 0.3;
		cursor: default;
	}

	.counter {
		font-family: var(--font-serif);
		font-size: 0.9rem;
		color: rgba(var(--paper-rgb), 0.5);
		letter-spacing: 0.15em;
	}

	.close-btn {
		position: fixed;
		top: 1.5rem;
		right: 1.5rem;
		z-index: 2;
		background: none;
		border: none;
		color: rgba(var(--paper-rgb), 0.6);
		font-size: 2rem;
		cursor: pointer;
		width: 44px;
		height: 44px;
		display: flex;
		align-items: center;
		justify-content: center;
		transition: color 300ms ease;
	}

	.close-btn:hover {
		color: rgba(var(--paper-rgb), 1);
	}

	@media (prefers-reduced-motion: no-preference) {
		.nav-btn {
			transition:
				border-color 300ms ease,
				color 300ms ease;
		}
		.close-btn {
			transition: color 300ms ease;
		}
	}
</style>
