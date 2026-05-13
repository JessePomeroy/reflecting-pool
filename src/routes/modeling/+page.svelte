<script lang="ts">
import HeadshotOrbitGallery from "$lib/components/HeadshotOrbitGallery.svelte";
import LeafLayer from "$lib/components/LeafLayer.svelte";
import Navigation from "$lib/components/Navigation.svelte";
import StrokeTitle from "$lib/components/StrokeTitle.svelte";
import WaterSurface from "$lib/components/WaterSurface.svelte";
import type { PageData } from "./$types";

let { data }: { data: PageData } = $props();
</script>

<svelte:head>
	<title>modeling & acting · margaret helena</title>
	<meta
		name="description"
		content={data.modeling.seo.description}
	/>
	{#if data.modeling.seo.ogImage}
		<meta property="og:image" content={data.modeling.seo.ogImage} />
	{/if}
</svelte:head>

<WaterSurface />
<LeafLayer />

<header class="site-header">
	<div class="header-left">
		<a class="home-link" href="/" aria-label="Home">
			<StrokeTitle />
		</a>
	</div>
	<div class="header-right">
		<Navigation />
	</div>
</header>

<HeadshotOrbitGallery
	eyebrow={data.modeling.eyebrow}
	heading={data.modeling.heading}
	intro={data.modeling.intro}
	galleries={data.modeling.galleries}
/>

<style>
	.site-header {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		z-index: 15;
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		padding: 1.5rem 2.5rem;
		pointer-events: none;
	}

	.header-left,
	.header-right {
		pointer-events: auto;
	}

	.header-right {
		padding-top: 3.5rem;
	}

	.home-link {
		display: block;
		color: inherit;
		text-decoration: none;
	}

	:global(.site-header .title) {
		max-width: none;
		white-space: nowrap;
	}

	@media (max-width: 767px) {
		.site-header {
			padding: 1rem 1.2rem;
		}
	}
</style>
