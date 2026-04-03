<script lang="ts">
	import { onMount } from 'svelte';
	import type { ClusterImage } from '$lib/types/gallery';

	interface Props {
		src: string;
		currentIndex: number;
		images: ClusterImage[];
		onclose: () => void;
	}

	let { src, currentIndex, images, onclose }: Props = $props();

	let index = $state(currentIndex);
	let visible = $state(false);
	let currentSrc = $derived(images[index]?.src ?? src);

	// Touch swipe tracking
	let touchStartX = 0;

	function next() {
		if (index < images.length - 1) index++;
	}

	function prev() {
		if (index > 0) index--;
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') onclose();
		if (e.key === 'ArrowRight') next();
		if (e.key === 'ArrowLeft') prev();
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

	onMount(() => {
		requestAnimationFrame(() => {
			visible = true;
		});

		// Focus for keyboard events
		return () => {};
	});
</script>

<svelte:window onkeydown={handleKeydown} />

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
	class="lightbox"
	class:visible
	onclick={onclose}
	ontouchstart={handleTouchStart}
	ontouchend={handleTouchEnd}
	role="dialog"
	aria-modal="true"
	aria-label="Image viewer"
>
	<div class="lightbox-overlay"></div>

	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div class="lightbox-content" onclick={(e) => e.stopPropagation()}>
		<img src={currentSrc} alt="" class="lightbox-image" />
	</div>

	<div class="lightbox-controls">
		<button class="nav-btn prev" onclick={(e) => { e.stopPropagation(); prev(); }} disabled={index === 0}>
			‹
		</button>
		<span class="counter">{index + 1} / {images.length}</span>
		<button class="nav-btn next" onclick={(e) => { e.stopPropagation(); next(); }} disabled={index === images.length - 1}>
			›
		</button>
	</div>

	<button class="close-btn" onclick={onclose}>×</button>
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
		transition: opacity 500ms ease;
	}

	.lightbox.visible {
		opacity: 1;
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
		border: 1px solid rgba(240, 244, 248, 0.2);
		color: rgba(240, 244, 248, 0.7);
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
		border-color: rgba(240, 244, 248, 0.5);
		color: rgba(240, 244, 248, 1);
	}

	.nav-btn:disabled {
		opacity: 0.3;
		cursor: default;
	}

	.counter {
		font-family: 'Cormorant', serif;
		font-size: 0.9rem;
		color: rgba(240, 244, 248, 0.5);
		letter-spacing: 0.15em;
	}

	.close-btn {
		position: fixed;
		top: 1.5rem;
		right: 1.5rem;
		z-index: 2;
		background: none;
		border: none;
		color: rgba(240, 244, 248, 0.6);
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
		color: rgba(240, 244, 248, 1);
	}
</style>
