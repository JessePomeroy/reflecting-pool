<script lang="ts">
interface Props {
	src: string;
	alt: string;
	width?: number;
	height?: number;
	sizes?: string;
	class?: string;
}

let { src, alt, width, height, sizes, class: className = "" }: Props = $props();

let loaded = $state(false);
</script>

<div class="optimized-image {className}" class:loaded>
	<img
		{src}
		{alt}
		{width}
		{height}
		{sizes}
		loading="lazy"
		decoding="async"
		onload={() => (loaded = true)}
	/>
</div>

<style>
	.optimized-image {
		overflow: hidden;
	}

	.optimized-image img {
		opacity: 0;
		filter: blur(10px);
		transition:
			opacity 0.4s ease,
			filter 0.4s ease;
	}

	.optimized-image.loaded img {
		opacity: 1;
		filter: blur(0);
	}

	@media (prefers-reduced-motion: reduce) {
		.optimized-image img {
			transition: none;
			opacity: 1;
			filter: none;
		}
	}
</style>