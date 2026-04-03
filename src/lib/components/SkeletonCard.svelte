<script lang="ts">
interface Props {
	aspect?: string;
	lines?: number;
}

let { aspect = "3/4", lines = 2 }: Props = $props();
</script>

<div class="skeleton-card">
	<div class="skeleton-image" style="aspect-ratio: {aspect}"></div>
	{#each Array(lines) as _, i}
		<div class="skeleton-line" style="width: {i === 0 ? '80%' : '60%'}"></div>
	{/each}
</div>

<style>
	.skeleton-card {
		border-radius: 8px;
		overflow: hidden;
	}

	.skeleton-image {
		background: linear-gradient(
			90deg,
			rgba(255, 255, 255, 0.05) 25%,
			rgba(255, 255, 255, 0.1) 50%,
			rgba(255, 255, 255, 0.05) 75%
		);
		background-size: 200% 100%;
		animation: shimmer 1.5s infinite;
	}

	.skeleton-line {
		height: 12px;
		margin: 8px 0;
		border-radius: 4px;
		background: linear-gradient(
			90deg,
			rgba(255, 255, 255, 0.05) 25%,
			rgba(255, 255, 255, 0.1) 50%,
			rgba(255, 255, 255, 0.05) 75%
		);
		background-size: 200% 100%;
		animation: shimmer 1.5s infinite;
	}

	@keyframes shimmer {
		0% {
			background-position: 200% 0;
		}
		100% {
			background-position: -200% 0;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.skeleton-image,
		.skeleton-line {
			animation: none;
			background: rgba(255, 255, 255, 0.08);
		}
	}
</style>