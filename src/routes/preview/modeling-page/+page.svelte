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
	<title>Modeling draft preview · Margaret Helena</title>
	<meta name="description" content={data.modeling.seo.description} />
	<meta name="robots" content="noindex, nofollow, noarchive" />
	{#if data.modeling.seo.ogImage}
		<meta property="og:image" content={data.modeling.seo.ogImage} />
	{/if}
</svelte:head>

<WaterSurface />
<LeafLayer />

<header class="site-header">
	<div class="header-left">
		<a class="home-link" href="/" aria-label="Home"><StrokeTitle /></a>
	</div>
	<div class="header-right"><Navigation /></div>
</header>

<HeadshotOrbitGallery
	heading={data.modeling.heading}
	intro={data.modeling.intro}
	galleries={data.modeling.galleries}
/>

<aside aria-label="Draft preview">
	<strong>draft preview</strong>
	<span>only you can see this saved Modeling draft</span>
	<a href="/admin/editor/pages/modeling">return to editor</a>
</aside>

<style>
	.site-header { position: fixed; inset: 0 0 auto; z-index: 15; display: flex; justify-content: space-between; align-items: flex-start; padding: 1.5rem 2.5rem; pointer-events: none; }
	.header-left, .header-right { pointer-events: auto; }
	.header-right { padding-top: 3.5rem; }
	.home-link { display: block; color: inherit; text-decoration: none; }
	:global(.site-header .title) { max-width: none; white-space: nowrap; }
	aside { position: fixed; right: 1rem; bottom: 5.6rem; z-index: 300; display: flex; gap: .8rem; align-items: center; padding: .7rem .9rem; border: 1px solid rgba(var(--paper-rgb), .32); border-radius: 999px; background: rgba(var(--ink-rgb), .82); color: rgba(var(--paper-rgb), .82); font-family: var(--font-serif); font-size: .72rem; letter-spacing: .08em; backdrop-filter: blur(12px); }
	strong { font-weight: 400; text-transform: lowercase; }
	span { color: rgba(var(--paper-rgb), .58); }
	a { color: inherit; text-underline-offset: .2em; }
	@media (max-width: 767px) {
		.site-header { padding: 1rem 1.2rem; }
		aside { left: 1rem; right: 1rem; bottom: 5.6rem; justify-content: space-between; border-radius: .6rem; }
		aside span { display: none; }
	}
</style>
